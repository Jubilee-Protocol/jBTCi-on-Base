// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseStrategy} from "./lib/tokenized-strategy/BaseStrategy.sol";
import {
    SafeERC20,
    IERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {FullMath} from "./libraries/FullMath.sol";

/**
 * @title JETHs - Jubilee ETH Staking Index
 * @author Jubilee Labs on behalf of Jubilee Protocol & Hundredfold Foundation
 * @notice The first ETH Staking Index Fund on Base via Yearn V3
 * @dev Manages a diversified portfolio of LSTs: wstETH, cbETH, rETH
 *
 * LAUNCH DATE: February 7, 2026
 *
 * Key Differences from jBTCi:
 * - 18 decimals (vs 8 for BTC)
 * - 3 underlying assets (vs 2)
 * - LST-specific oracle feeds
 * - Staking yield accrual tracking
 */

// ============================================================================
//                           CUSTOM ERRORS
// ============================================================================

error ZeroAddress();
error SameAddress();
error InvalidPrice();
error StalePrice();
error PriceDeviation();
error PriceOutOfRange();
error InsufficientBalance();
error PositionTooSmall();
error PositionTooLarge();
error SlippageExceeded();
error AmountExceedsLimit();
error AmountIsZero();
error InternalOnly();
error AlreadyPaused();
error NotPaused();
error AlreadyInFailureMode();
error NotInFailureMode();
error BelowMinimum();
error ExceedsMaximum();
error DuplicateTokens();
error InvalidTick();
error InvalidPool();
error WeightMismatch();

// ============================================================================
//                            INTERFACES
// ============================================================================

interface IChainlinkOracle {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );

    function observe(
        uint32[] calldata secondsAgos
    )
        external
        view
        returns (
            int56[] memory tickCumulatives,
            uint160[] memory secondsPerLiquidityCumulativeX128s
        );

    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IDEXRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);
}

// ============================================================================
//                            MAIN CONTRACT
// ============================================================================

contract YearnJETHsStrategy is BaseStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ========================================================================
    //                        STATE VARIABLES - TOKENS
    // ========================================================================

    /// @notice Lido Wrapped Staked ETH
    IERC20 public immutable WSTETH;

    /// @notice Coinbase Wrapped Staked ETH
    IERC20 public immutable CBETH;

    /// @notice Rocket Pool ETH
    IERC20 public immutable RETH;

    // ========================================================================
    //                        STATE VARIABLES - ORACLES
    // ========================================================================

    /// @notice ETH/USD price feed
    IChainlinkOracle public immutable ETH_USD_ORACLE;

    /// @notice stETH/ETH exchange rate feed
    IChainlinkOracle public immutable STETH_ETH_ORACLE;

    /// @notice cbETH/ETH exchange rate feed
    IChainlinkOracle public immutable CBETH_ETH_ORACLE;

    /// @notice rETH/ETH exchange rate feed
    IChainlinkOracle public immutable RETH_ETH_ORACLE;

    // Uniswap V3 pools for TWAP validation
    IUniswapV3Pool public immutable WSTETH_ETH_POOL;
    IUniswapV3Pool public immutable CBETH_ETH_POOL;
    IUniswapV3Pool public immutable RETH_ETH_POOL;

    // ========================================================================
    //                        STATE VARIABLES - ROUTERS
    // ========================================================================

    IDEXRouter public immutable PRIMARY_ROUTER; // Uniswap or Curve
    IDEXRouter public immutable SECONDARY_ROUTER; // Backup router

    // ========================================================================
    //                    STATE VARIABLES - STRATEGY PARAMETERS
    // ========================================================================

    /// @notice Target allocation weights (basis points, must sum to 10000)
    uint256 public wstethWeight = 4000; // 40%
    uint256 public cbethWeight = 3500; // 35%
    uint256 public rethWeight = 2500; // 25%

    /// @notice Deposit cap in ETH (18 decimals)
    uint256 public depositCap = 1000 ether; // 1000 ETH initial cap

    /// @notice Rebalance when allocation drifts by this amount (basis points)
    uint256 public rebalanceThreshold = 200; // 2%

    /// @notice Minimum profit to execute arbitrage
    uint256 public minArbitrageProfit = 0.01 ether;

    // Rate limiting
    uint256 public dailySwapLimitETH = 500 ether;
    uint256 public swapLimitResetTime;
    uint256 public dailySwapVolumeUsed;

    uint256 public lastRebalanceTime;
    uint256 public minRebalanceInterval = 1 hours;

    // Circuit breaker
    uint256 public failedRebalanceCount;
    uint256 public constant MAX_FAILED_REBALANCES = 3;
    bool public circuitBreakerTriggered;
    bool public rebalancingPaused;

    // Tracking
    uint256 public totalRebalancesExecuted;
    uint256 public totalSwapsExecuted;

    // ========================================================================
    //                            CONSTANTS
    // ========================================================================

    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant ORACLE_STALE_THRESHOLD = 1 hours;
    uint256 private constant ORACLE_PRICE_DEVIATION_THRESHOLD = 200; // 2%
    uint256 private constant TWAP_PERIOD = 30 minutes;
    uint256 public maxSlippage = 100; // 1%

    // ========================================================================
    //                            STRUCTS
    // ========================================================================

    struct StrategyStatus {
        bool isPaused;
        bool isCBTriggered;
        uint256 totalHoldings;
        uint256 dailySwapUsed;
        uint256 dailySwapLimit;
        uint256 rebalancesExecuted;
        uint256 wstethAlloc;
        uint256 cbethAlloc;
        uint256 rethAlloc;
    }

    // ========================================================================
    //                                EVENTS
    // ========================================================================

    event Rebalanced(
        address indexed fromToken,
        address indexed toToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    event WeightsUpdated(
        uint256 wstethWeight,
        uint256 cbethWeight,
        uint256 rethWeight,
        uint256 timestamp
    );

    event CircuitBreakerTriggered(string reason, uint256 timestamp);
    event CircuitBreakerReset(uint256 timestamp);

    // ========================================================================
    //                            CONSTRUCTOR
    // ========================================================================

    constructor(
        address _asset, // WETH or native ETH wrapper
        string memory _name,
        address _wsteth,
        address _cbeth,
        address _reth,
        address _ethUsdOracle,
        address _stethEthOracle,
        address _cbethEthOracle,
        address _rethEthOracle,
        address _wstethEthPool,
        address _cbethEthPool,
        address _rethEthPool,
        address _primaryRouter,
        address _secondaryRouter
    ) BaseStrategy(_asset, _name) {
        // Validate inputs
        if (_wsteth == address(0)) revert ZeroAddress();
        if (_cbeth == address(0)) revert ZeroAddress();
        if (_reth == address(0)) revert ZeroAddress();
        if (_ethUsdOracle == address(0)) revert ZeroAddress();
        if (_primaryRouter == address(0)) revert ZeroAddress();

        WSTETH = IERC20(_wsteth);
        CBETH = IERC20(_cbeth);
        RETH = IERC20(_reth);

        ETH_USD_ORACLE = IChainlinkOracle(_ethUsdOracle);
        STETH_ETH_ORACLE = IChainlinkOracle(_stethEthOracle);
        CBETH_ETH_ORACLE = IChainlinkOracle(_cbethEthOracle);
        RETH_ETH_ORACLE = IChainlinkOracle(_rethEthOracle);

        WSTETH_ETH_POOL = IUniswapV3Pool(_wstethEthPool);
        CBETH_ETH_POOL = IUniswapV3Pool(_cbethEthPool);
        RETH_ETH_POOL = IUniswapV3Pool(_rethEthPool);

        PRIMARY_ROUTER = IDEXRouter(_primaryRouter);
        SECONDARY_ROUTER = IDEXRouter(_secondaryRouter);

        swapLimitResetTime = block.timestamp + 1 days;
    }

    // ========================================================================
    //                    YEARN STRATEGY REQUIRED FUNCTIONS
    // ========================================================================

    function _deployFunds(
        uint256 /* _amount */
    ) internal override nonReentrant {
        if (
            rebalancingPaused ||
            TokenizedStrategy.isShutdown() ||
            circuitBreakerTriggered
        ) {
            return;
        }

        if (block.timestamp < lastRebalanceTime + minRebalanceInterval) {
            return;
        }

        if (_shouldRebalance()) {
            _executeRebalance();
        }
    }

    function _freeFunds(uint256 _amount) internal override nonReentrant {
        uint256 totalBalance = _calculateTotalHoldings();
        if (totalBalance < _amount) revert InsufficientBalance();

        // Proportional withdrawal from all three LSTs
        uint256 wstethBalance = WSTETH.balanceOf(address(this));
        uint256 cbethBalance = CBETH.balanceOf(address(this));
        uint256 rethBalance = RETH.balanceOf(address(this));

        if (wstethBalance > 0) {
            uint256 toWithdraw = (_amount * wstethBalance) / totalBalance;
            if (toWithdraw > 0) {
                _swapToAsset(address(WSTETH), toWithdraw);
            }
        }

        if (cbethBalance > 0) {
            uint256 toWithdraw = (_amount * cbethBalance) / totalBalance;
            if (toWithdraw > 0) {
                _swapToAsset(address(CBETH), toWithdraw);
            }
        }

        if (rethBalance > 0) {
            uint256 toWithdraw = (_amount * rethBalance) / totalBalance;
            if (toWithdraw > 0) {
                _swapToAsset(address(RETH), toWithdraw);
            }
        }
    }

    function _harvestAndReport()
        internal
        override
        nonReentrant
        returns (uint256 _totalAssets)
    {
        if (!TokenizedStrategy.isShutdown() && !rebalancingPaused) {
            if (!circuitBreakerTriggered && _shouldRebalance()) {
                try this._executeRebalanceInternal() {
                    failedRebalanceCount = 0;
                    lastRebalanceTime = block.timestamp;
                    totalRebalancesExecuted++;
                } catch {
                    failedRebalanceCount++;
                    if (failedRebalanceCount >= MAX_FAILED_REBALANCES) {
                        circuitBreakerTriggered = true;
                        emit CircuitBreakerTriggered(
                            "MaxFailures",
                            block.timestamp
                        );
                    }
                }
            }
        }

        _totalAssets = _calculateTotalHoldings();
        return _totalAssets;
    }

    function availableDepositLimit(
        address
    ) public view override returns (uint256) {
        uint256 positionSize = _calculateTotalHoldings();
        return positionSize >= depositCap ? 0 : depositCap - positionSize;
    }

    function availableWithdrawLimit(
        address
    ) public view override returns (uint256) {
        return TokenizedStrategy.totalAssets();
    }

    function _emergencyWithdraw(
        uint256 _amount
    ) internal override nonReentrant {
        _amount = Math.min(_amount, _calculateTotalHoldings());

        // Emergency: swap all LSTs back to base asset
        uint256 wstethBalance = WSTETH.balanceOf(address(this));
        if (wstethBalance > 0) {
            _swapToAsset(address(WSTETH), wstethBalance);
        }

        uint256 cbethBalance = CBETH.balanceOf(address(this));
        if (cbethBalance > 0) {
            _swapToAsset(address(CBETH), cbethBalance);
        }

        uint256 rethBalance = RETH.balanceOf(address(this));
        if (rethBalance > 0) {
            _swapToAsset(address(RETH), rethBalance);
        }
    }

    // ========================================================================
    //                        INTERNAL FUNCTIONS
    // ========================================================================

    function _calculateTotalHoldings() internal view returns (uint256) {
        uint256 wstethValue = _getValueInETH(
            address(WSTETH),
            WSTETH.balanceOf(address(this))
        );
        uint256 cbethValue = _getValueInETH(
            address(CBETH),
            CBETH.balanceOf(address(this))
        );
        uint256 rethValue = _getValueInETH(
            address(RETH),
            RETH.balanceOf(address(this))
        );
        uint256 assetBalance = IERC20(asset).balanceOf(address(this));

        return wstethValue + cbethValue + rethValue + assetBalance;
    }

    function _getValueInETH(
        address token,
        uint256 amount
    ) internal view returns (uint256) {
        if (amount == 0) return 0;

        // Get exchange rate from oracle
        uint256 rate;
        if (token == address(WSTETH)) {
            (, int256 answer, , , ) = STETH_ETH_ORACLE.latestRoundData();
            rate = uint256(answer);
        } else if (token == address(CBETH)) {
            (, int256 answer, , , ) = CBETH_ETH_ORACLE.latestRoundData();
            rate = uint256(answer);
        } else if (token == address(RETH)) {
            (, int256 answer, , , ) = RETH_ETH_ORACLE.latestRoundData();
            rate = uint256(answer);
        } else {
            return amount; // Assume 1:1 for base asset
        }

        return (amount * rate) / 1e18;
    }

    function _shouldRebalance() internal view returns (bool) {
        (
            uint256 wstethAlloc,
            uint256 cbethAlloc,
            uint256 rethAlloc
        ) = _getCurrentAllocations();

        // Check if any allocation is outside threshold
        if (_absDiff(wstethAlloc, wstethWeight) > rebalanceThreshold)
            return true;
        if (_absDiff(cbethAlloc, cbethWeight) > rebalanceThreshold) return true;
        if (_absDiff(rethAlloc, rethWeight) > rebalanceThreshold) return true;

        return false;
    }

    function _getCurrentAllocations()
        internal
        view
        returns (uint256, uint256, uint256)
    {
        uint256 total = _calculateTotalHoldings();
        if (total == 0) return (wstethWeight, cbethWeight, rethWeight);

        uint256 wstethValue = _getValueInETH(
            address(WSTETH),
            WSTETH.balanceOf(address(this))
        );
        uint256 cbethValue = _getValueInETH(
            address(CBETH),
            CBETH.balanceOf(address(this))
        );
        uint256 rethValue = _getValueInETH(
            address(RETH),
            RETH.balanceOf(address(this))
        );

        return (
            (wstethValue * BASIS_POINTS) / total,
            (cbethValue * BASIS_POINTS) / total,
            (rethValue * BASIS_POINTS) / total
        );
    }

    function _executeRebalance() internal {
        // TODO: Implement rebalancing logic
        // Similar to jBTCi but with 3 assets
    }

    function _executeRebalanceInternal() external {
        if (msg.sender != address(this)) revert InternalOnly();
        _executeRebalance();
    }

    function _swapToAsset(address fromToken, uint256 amount) internal {
        // TODO: Implement swap logic via router
    }

    function _absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }

    // ========================================================================
    //                        VIEW FUNCTIONS
    // ========================================================================

    function getStrategyStatus() external view returns (StrategyStatus memory) {
        (
            uint256 wstethAlloc,
            uint256 cbethAlloc,
            uint256 rethAlloc
        ) = _getCurrentAllocations();

        return
            StrategyStatus({
                isPaused: rebalancingPaused,
                isCBTriggered: circuitBreakerTriggered,
                totalHoldings: _calculateTotalHoldings(),
                dailySwapUsed: dailySwapVolumeUsed,
                dailySwapLimit: dailySwapLimitETH,
                rebalancesExecuted: totalRebalancesExecuted,
                wstethAlloc: wstethAlloc,
                cbethAlloc: cbethAlloc,
                rethAlloc: rethAlloc
            });
    }

    function getETHPrice() external view returns (uint256) {
        (, int256 answer, , , ) = ETH_USD_ORACLE.latestRoundData();
        return uint256(answer);
    }

    // ========================================================================
    //                        ADMIN FUNCTIONS
    // ========================================================================

    function setWeights(
        uint256 _wstethWeight,
        uint256 _cbethWeight,
        uint256 _rethWeight
    ) external onlyManagement {
        if (_wstethWeight + _cbethWeight + _rethWeight != BASIS_POINTS) {
            revert WeightMismatch();
        }

        wstethWeight = _wstethWeight;
        cbethWeight = _cbethWeight;
        rethWeight = _rethWeight;

        emit WeightsUpdated(
            _wstethWeight,
            _cbethWeight,
            _rethWeight,
            block.timestamp
        );
    }

    function setDepositCap(uint256 _cap) external onlyManagement {
        depositCap = _cap;
    }

    function setRebalanceThreshold(uint256 _threshold) external onlyManagement {
        rebalanceThreshold = _threshold;
    }

    function pauseRebalancing() external onlyManagement {
        rebalancingPaused = true;
    }

    function unpauseRebalancing() external onlyManagement {
        rebalancingPaused = false;
    }

    function resetCircuitBreaker() external onlyManagement {
        circuitBreakerTriggered = false;
        failedRebalanceCount = 0;
        emit CircuitBreakerReset(block.timestamp);
    }
}
