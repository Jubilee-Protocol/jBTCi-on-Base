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
 * @title JBTCi
 * @author Jubilee Labs on behalf of Jubilee Protocol & Hundredfold Foundation
 * @notice The first Bitcoin Index Fund on Base via Yearn V3
 */

// ============================================================================
//                           CUSTOM ERRORS
// ============================================================================

/// @dev Zero address provided
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
//                            LIBRARIES
// ============================================================================

/**
 * @notice Uniswap V3 Tick Math Library (not approximation)
 */
library TickMath {
    int24 internal constant MIN_TICK = -887272;
    int24 internal constant MAX_TICK = 887272;

    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO =
        1461446703485210103287273052203988822378723720583;

    function getSqrtRatioAtTick(
        int24 tick
    ) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0
            ? uint256(-int256(tick))
            : uint256(int256(tick));
        if (absTick > uint256(int256(MAX_TICK))) revert InvalidTick();

        uint256 ratio = absTick & 0x1 != 0
            ? 0xfffcb933bd6fad37aa2d162d1a594001
            : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0)
            ratio = (ratio * 0xfff97272373d413108a59cd6c9a98ca) >> 128;
        if (absTick & 0x4 != 0)
            ratio = (ratio * 0xfff2e50f5f656932ef12357cf3893ae3) >> 128;
        if (absTick & 0x8 != 0)
            ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
        if (absTick & 0x10 != 0)
            ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0)
            ratio = (ratio * 0xff973b41fa98c081472684c4ef8f63a) >> 128;
        if (absTick & 0x40 != 0)
            ratio = (ratio * 0xff2ea16466c96a3fed829ccc0aeca9ac) >> 128;
        if (absTick & 0x80 != 0)
            ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0)
            ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4) >> 128;
        if (absTick & 0x200 != 0)
            ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e3a) >> 128;
        if (absTick & 0x400 != 0)
            ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0)
            ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
        if (absTick & 0x1000 != 0)
            ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792b985b7) >> 128;
        if (absTick & 0x2000 != 0)
            ratio = (ratio * 0xa9f746462d870fdf8865dc1910d7fd8b) >> 128;
        if (absTick & 0x4000 != 0)
            ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7) >> 128;
        if (absTick & 0x8000 != 0)
            ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6) >> 128;
        if (absTick & 0x10000 != 0)
            ratio = (ratio * 0x9aa508b5b7a84e1c6d0b7f2d4f4d3d3d) >> 128;

        if (tick > 0) ratio = type(uint256).max / ratio;

        sqrtPriceX96 = uint160(
            (ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1)
        );
    }
}

// ============================================================================
//                            MAIN CONTRACT
// ============================================================================

contract YearnJBTCiStrategy is BaseStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ========================================================================
    //                        STATE VARIABLES - TOKENS
    // ========================================================================

    IERC20 public immutable WBTC;
    IERC20 public immutable CBBTC;

    // ========================================================================
    //                        STATE VARIABLES - ORACLES
    // ========================================================================

    IChainlinkOracle public immutable BTC_USD_ORACLE;
    IChainlinkOracle public immutable ETH_USD_ORACLE;
    IUniswapV3Pool public immutable UNISWAP_V3_POOL_WBTC_ETH;
    IUniswapV3Pool public immutable UNISWAP_V3_POOL_CBBTC_USDC;

    // Fallback oracle addresses (for recovery)
    address public fallbackBtcOracle;
    address public fallbackEthOracle;

    // ========================================================================
    //                        STATE VARIABLES - ROUTERS
    // ========================================================================

    IDEXRouter public immutable AERODROME_ROUTER;
    IDEXRouter public immutable UNISWAP_ROUTER;

    // ========================================================================
    //                    STATE VARIABLES - STRATEGY PARAMETERS
    // ========================================================================

    uint256 public depositCap = 50e8;
    uint256 public rebalanceThreshold = 200;
    uint256 public minArbitrageProfit = 0.005e8;

    // Dynamic gas tracking
    uint256 public lastEstimatedGasInBTC;
    uint256 public maxGasPerRebalancePercent = 500; // 5%

    // Approval management
    mapping(address => mapping(address => uint256)) public swapApprovals;
    mapping(address => mapping(address => uint256)) public approvalTimestamps;
    mapping(address => mapping(address => bool)) public approvalExpired;
    uint256 public maxApprovalPerSwap = 10e8;

    // Circuit breaker - multi-level
    uint256 public failedRebalanceCount;
    uint256 public lastFailedRebalance;
    uint256 public constant MAX_FAILED_REBALANCES = 3;
    uint256 public circuitBreakerCooldown = 1 days;
    bool public circuitBreakerTriggered;
    bool public gradualRecoveryActive;
    uint256 public preRecoveryDailyLimit;

    // Emergency state
    uint256 public emergencyWithdrawCount;
    uint256 public lastEmergencyWithdraw;

    // Position limits
    uint256 public maxPositionSize = 1000e8; // 1000 BTC maximum position
    uint256 public minPositionSize = 0.01e8; // 0.01 BTC minimum

    // Rate limiting with tracking
    uint256 public dailySwapLimitBTC = 2000e8; // 2000 BTC daily swap limit
    uint256 public swapLimitResetTime;
    uint256 public dailySwapVolumeUsed;

    uint256 public lastRebalanceTime;
    uint256 public minRebalanceInterval = 1 hours;
    uint256 public lastSwapTime;
    uint256 public minSwapInterval = 10 minutes;

    // Operational flags
    bool public rebalancingPaused;
    bool public emergencyWithdrawActive;
    bool public oracleFailureMode; // Use fallback oracles

    // Historical tracking for monitoring
    uint256 public totalRebalancesExecuted;
    uint256 public totalRebalancesFailed;
    uint256 public totalSwapsExecuted;
    uint256 public totalSwapsFailed;

    // ========================================================================
    //                            CONSTANTS
    // ========================================================================

    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant ORACLE_STALE_THRESHOLD = 1 hours;
    uint256 private constant ORACLE_STALE_THRESHOLD_FALLBACK = 24 hours;
    uint256 private constant ORACLE_PRICE_DEVIATION_THRESHOLD = 200; // 2%
    uint256 private constant TWAP_DEVIATION_THRESHOLD = 100; // 1%
    uint256 public maxSlippage = 100; // 1% default, configurable
    uint256 private constant EMERGENCY_SLIPPAGE = 500; // 5%
    uint256 public swapFee = 25; // 0.25% default, configurable
    uint256 private constant MIN_REBALANCE_THRESHOLD = 50;
    uint256 private constant MAX_REBALANCE_THRESHOLD = 1000;
    uint256 private constant MIN_DEPOSIT_CAP = 1e8;
    uint256 private constant MAX_DEPOSIT_CAP = 1000e8; // 1000 BTC maximum
    uint256 private constant TWAP_PERIOD = 30 minutes;
    uint256 private constant GAS_ESTIMATION_BASE = 400_000;
    uint256 private constant GAS_ESTIMATION_BUFFER = 200_000;

    // Price safety bounds
    uint256 private constant MAX_PRICE_CHANGE_PERCENT = 1000; // 10% max per block
    uint256 private constant MIN_ORACLE_PRICE = 1e7; // $10K minimum
    uint256 private constant MAX_ORACLE_PRICE = 1e9; // $10M maximum

    struct StrategyStatus {
        bool isPaused;
        bool isCBTriggered;
        bool isInOracleFailureMode;
        uint256 totalHoldings;
        uint256 dailySwapUsed;
        uint256 dailySwapLimit;
        uint256 lastGasCost;
        uint256 rebalancesExecuted;
        uint256 rebalancesFailed;
        uint256 swapsExecuted;
        uint256 swapsFailed;
        uint256 wbtcAlloc;
        uint256 cbbtcAlloc;
        uint256 failCount;
        uint256 timeUntilReset;
    }

    // ========================================================================
    //                                EVENTS
    // ========================================================================

    event Rebalanced(
        address indexed fromToken,
        address indexed toToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event RebalancingCompleted(
        uint256 indexed rebalanceId,
        uint256 timestamp,
        uint256 totalImbalance,
        uint256 gasCost
    );

    event RebalancingFailed(
        uint256 indexed rebalanceId,
        uint256 timestamp,
        uint256 failCount,
        string reason
    );

    event CircuitBreakerTriggered(string indexed reason, uint256 timestamp);
    event CircuitBreakerReset(uint256 timestamp);
    event OracleModeChanged(bool failureMode, uint256 timestamp);
    event DailyLimitReset(uint256 newLimit, uint256 timestamp);

    event ParametersUpdated(
        uint256 depositCap,
        uint256 rebalanceThreshold,
        uint256 minProfit,
        uint256 timestamp
    );

    event EmergencyAction(string indexed action, uint256 timestamp);
    event ApprovalIssued(
        address indexed token,
        address indexed spender,
        uint256 amount,
        uint256 expiry,
        uint256 timestamp
    );
    event ApprovalRevoked(
        address indexed token,
        address indexed spender,
        uint256 timestamp
    );
    event SwapExecuted(
        address indexed fromToken,
        address indexed toToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 slippageUsed,
        uint256 oraclePrice,
        uint256 dexPrice,
        uint256 timestamp
    );

    event MEVProtectionTriggered(
        string indexed reason,
        uint256 oraclePrice,
        uint256 dexPrice,
        uint256 deviation,
        uint256 timestamp
    );

    event RateLimitExceeded(
        string indexed reason,
        uint256 value,
        uint256 timestamp
    );
    event GasCostCalculated(
        uint256 gasCostWei,
        uint256 gasCostBTC,
        uint256 timestamp
    );
    event OraclePriceUpdate(
        address indexed tokenPair,
        uint256 priceFromOracle,
        uint256 priceFromDEX,
        uint256 deviationBps,
        uint256 timestamp
    );
    event OracleFailureDetected(
        address indexed oracle,
        string reason,
        uint256 timestamp
    );
    event HealthCheck(
        uint256 timestamp,
        bool oraclesHealthy,
        bool routersHealthy,
        uint256 positionSize,
        uint256 allocWBTC,
        uint256 allocCBBTC
    );

    // ========================================================================
    //                            CONSTRUCTOR
    // ========================================================================

    constructor(
        address _asset,
        string memory _name,
        address _wbtc,
        address _cbbtc,
        address _btcUsdOracle,
        address _ethUsdOracle,
        address _uniswapV3PoolWbtcEth,
        address _uniswapV3PoolCbbtcUsdc,
        address _aerodromeRouter,
        address _uniswapRouter,
        address _fallbackBtcOracle,
        address _fallbackEthOracle
    ) BaseStrategy(_asset, _name) {
        // Validate all inputs
        _validateConstructorInputs(
            _wbtc,
            _cbbtc,
            _btcUsdOracle,
            _ethUsdOracle,
            _uniswapV3PoolWbtcEth,
            _uniswapV3PoolCbbtcUsdc,
            _aerodromeRouter,
            _uniswapRouter,
            _fallbackBtcOracle,
            _fallbackEthOracle
        );

        WBTC = IERC20(_wbtc);
        CBBTC = IERC20(_cbbtc);

        BTC_USD_ORACLE = IChainlinkOracle(_btcUsdOracle);
        ETH_USD_ORACLE = IChainlinkOracle(_ethUsdOracle);

        UNISWAP_V3_POOL_WBTC_ETH = IUniswapV3Pool(_uniswapV3PoolWbtcEth);
        UNISWAP_V3_POOL_CBBTC_USDC = IUniswapV3Pool(_uniswapV3PoolCbbtcUsdc);

        AERODROME_ROUTER = IDEXRouter(_aerodromeRouter);
        UNISWAP_ROUTER = IDEXRouter(_uniswapRouter);

        fallbackBtcOracle = _fallbackBtcOracle;
        fallbackEthOracle = _fallbackEthOracle;

        swapLimitResetTime = block.timestamp + 1 days;
    }

    /**
     * @notice Validate all constructor inputs
     * @dev CRITICAL:  Prevents initialization with invalid parameters
     */
    function _validateConstructorInputs(
        address _wbtc,
        address _cbbtc,
        address _btcUsdOracle,
        address _ethUsdOracle,
        address _uniswapV3PoolWbtcEth,
        address _uniswapV3PoolCbbtcUsdc,
        address _aerodromeRouter,
        address _uniswapRouter,
        address _fallbackBtcOracle,
        address _fallbackEthOracle
    ) internal view {
        if (_wbtc == address(0)) revert ZeroAddress();
        if (_cbbtc == address(0)) revert ZeroAddress();
        if (_btcUsdOracle == address(0)) revert ZeroAddress();
        if (_ethUsdOracle == address(0)) revert ZeroAddress();
        if (_uniswapV3PoolWbtcEth == address(0)) revert ZeroAddress();
        if (_uniswapV3PoolCbbtcUsdc == address(0)) revert ZeroAddress();
        if (_aerodromeRouter == address(0)) revert ZeroAddress();
        if (_uniswapRouter == address(0)) revert ZeroAddress();
        if (_fallbackBtcOracle == address(0)) revert ZeroAddress();
        if (_fallbackEthOracle == address(0)) revert ZeroAddress();

        // Verify tokens are different
        if (_wbtc == _cbbtc) revert DuplicateTokens();

        // Verify oracles are different
        if (_btcUsdOracle == _ethUsdOracle) revert SameAddress();
        if (_btcUsdOracle == _fallbackBtcOracle) revert SameAddress();
        if (_ethUsdOracle == _fallbackEthOracle) revert SameAddress();

        // Verify routers are different
        if (_aerodromeRouter == _uniswapRouter) revert SameAddress();

        // Validate WBTC/ETH pool contains WBTC
        address token0 = IUniswapV3Pool(_uniswapV3PoolWbtcEth).token0();
        address token1 = IUniswapV3Pool(_uniswapV3PoolWbtcEth).token1();
        if (token0 != _wbtc && token1 != _wbtc) revert InvalidPool();

        // Validate cbBTC/USDC pool contains cbBTC
        address cbToken0 = IUniswapV3Pool(_uniswapV3PoolCbbtcUsdc).token0();
        address cbToken1 = IUniswapV3Pool(_uniswapV3PoolCbbtcUsdc).token1();
        if (cbToken0 != _cbbtc && cbToken1 != _cbbtc) revert InvalidPool();
    }

    // ========================================================================
    //                    YEARN STRATEGY REQUIRED FUNCTIONS
    // ========================================================================

    function _deployFunds(
        uint256 /* _amount */
    ) internal override nonReentrant {
        // Safety checks
        if (
            rebalancingPaused ||
            TokenizedStrategy.isShutdown() ||
            circuitBreakerTriggered
        ) {
            return;
        }

        // Rate limiting
        if (block.timestamp < lastRebalanceTime + minRebalanceInterval) {
            emit RateLimitExceeded(
                "RebalInt",
                minRebalanceInterval,
                block.timestamp
            );
            return;
        }

        // Health check
        if (!_performHealthCheck()) {
            return;
        }

        // Check rebalancing is needed
        if (!_shouldRebalance()) {
            return;
        }

        _executeRebalance();
    }

    function _freeFunds(uint256 _amount) internal override nonReentrant {
        uint256 totalBalance = _calculateTotalHoldings();
        if (totalBalance < _amount) revert InsufficientBalance();

        uint256 wbtcBalance = WBTC.balanceOf(address(this));
        uint256 cbbtcBalance = CBBTC.balanceOf(address(this));

        // Proportional withdrawal with safety (50/50 split)
        if (wbtcBalance > 0) {
            uint256 wbtcToWithdraw = (_amount * wbtcBalance) / totalBalance;
            if (wbtcToWithdraw > 0 && wbtcToWithdraw <= wbtcBalance) {
                _swapIfNeeded(
                    address(WBTC),
                    address(asset),
                    wbtcToWithdraw,
                    false
                );
            }
        }

        if (cbbtcBalance > 0) {
            uint256 cbbtcToWithdraw = (_amount * cbbtcBalance) / totalBalance;
            if (cbbtcToWithdraw > 0 && cbbtcToWithdraw <= cbbtcBalance) {
                _swapIfNeeded(
                    address(CBBTC),
                    address(asset),
                    cbbtcToWithdraw,
                    false
                );
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
            _checkCircuitBreaker();

            if (
                !circuitBreakerTriggered &&
                _shouldRebalance() &&
                failedRebalanceCount < MAX_FAILED_REBALANCES
            ) {
                try this._executeRebalanceInternal() {
                    failedRebalanceCount = 0;
                    lastRebalanceTime = block.timestamp;
                    totalRebalancesExecuted++;
                } catch Error(string memory reason) {
                    _handleRebalanceFailure(reason);
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
        uint256 effectiveCap = Math.min(depositCap, maxPositionSize);

        return positionSize >= effectiveCap ? 0 : effectiveCap - positionSize;
    }

    function availableWithdrawLimit(
        address
    ) public view override returns (uint256) {
        return TokenizedStrategy.totalAssets();
    }

    function _emergencyWithdraw(
        uint256 _amount
    ) internal override nonReentrant {
        emergencyWithdrawActive = true;
        emergencyWithdrawCount++;
        lastEmergencyWithdraw = block.timestamp;

        _amount = Math.min(_amount, _calculateTotalHoldings());

        uint256 wbtcBalance = WBTC.balanceOf(address(this));
        if (wbtcBalance > 0) {
            _swapEmergency(address(WBTC), address(asset), wbtcBalance);
        }

        uint256 cbbtcBalance = CBBTC.balanceOf(address(this));
        if (cbbtcBalance > 0) {
            _swapEmergency(address(CBBTC), address(asset), cbbtcBalance);
        }

        _revokeAllApprovals();
        emergencyWithdrawActive = false;
        emit EmergencyAction("Withdraw", block.timestamp);
    }

    // ========================================================================
    //                        HEALTH CHECK SYSTEM
    // ========================================================================

    /**
     * @notice Perform comprehensive health check on strategy
     * @return healthy True if all systems operational
     */
    function _performHealthCheck() internal returns (bool healthy) {
        // Check oracles
        bool oraclesHealthy = true;
        try this.getBTCPrice() returns (uint256) {
            // Oracle working
        } catch {
            oraclesHealthy = false;
            emit OracleFailureDetected(
                address(BTC_USD_ORACLE),
                "OracleFail",
                block.timestamp
            );
        }
        // Check routers by attempting simulation
        bool routersHealthy = true;
        try this._checkRouterHealth() returns (bool healthy_) {
            routersHealthy = healthy_;
        } catch {
            routersHealthy = false;
            emit OracleFailureDetected(
                address(AERODROME_ROUTER),
                "RouterFail",
                block.timestamp
            );
        }
        // Get allocations (2-asset model: WBTC + cbBTC)
        (uint256 wbtcAlloc, uint256 cbbtcAlloc) = _getCurrentAllocations();

        emit HealthCheck(
            block.timestamp,
            oraclesHealthy,
            routersHealthy,
            _calculateTotalHoldings(),
            wbtcAlloc,
            cbbtcAlloc
        );

        return oraclesHealthy && routersHealthy;
    }

    /**
     * @notice Check if routers are operational
     */
    function _checkRouterHealth() external view returns (bool) {
        try AERODROME_ROUTER.getAmountsOut(1e8, new address[](2)) {
            return true;
        } catch {
            return false;
        }
    }

    // ========================================================================
    //              ORACLE & PRICE VALIDATION (PRODUCTION GRADE)
    // ========================================================================

    /**
     * @notice Get BTC price with comprehensive oracle validation
     * @return price BTC/USD price in 8 decimals
     */
    function getBTCPrice() public view returns (uint256 price) {
        uint256 chainlinkPrice;

        // Try primary oracle first
        try this._getChainlinkPrice(address(BTC_USD_ORACLE)) returns (
            uint256 price_
        ) {
            chainlinkPrice = price_;
        } catch {
            // Fallback to backup oracle
            try this._getChainlinkPrice(fallbackBtcOracle) returns (
                uint256 fallbackPrice
            ) {
                chainlinkPrice = fallbackPrice;
            } catch {
                revert InvalidPrice();
            }
        }
        // Get TWAP price
        uint256 twapPrice;
        try this._getTWAPPrice() returns (uint256 twap_) {
            twapPrice = twap_;
        } catch {
            // If TWAP fails, use Chainlink with warning
            twapPrice = chainlinkPrice;
        }
        // Validate deviation
        uint256 priceDiff = chainlinkPrice > twapPrice
            ? chainlinkPrice - twapPrice
            : twapPrice - chainlinkPrice;

        uint256 deviationBps = (priceDiff * BASIS_POINTS) / chainlinkPrice;

        if (deviationBps > ORACLE_PRICE_DEVIATION_THRESHOLD)
            revert PriceDeviation();

        // Sanity check on absolute price
        if (
            chainlinkPrice < MIN_ORACLE_PRICE ||
            chainlinkPrice > MAX_ORACLE_PRICE
        ) revert PriceOutOfRange();

        return chainlinkPrice;
    }

    /**
     * @notice Get price from Chainlink oracle with staleness check
     * @param oracle Oracle address to query
     */
    function _getChainlinkPrice(
        address oracle
    ) external view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = IChainlinkOracle(oracle)
            .latestRoundData();

        if (answer <= 0) revert InvalidPrice();

        uint256 staleThreshold = oracleFailureMode
            ? ORACLE_STALE_THRESHOLD_FALLBACK
            : ORACLE_STALE_THRESHOLD;

        if (block.timestamp - updatedAt >= staleThreshold) revert StalePrice();

        return uint256(answer);
    }

    /**
     * @notice Get TWAP price from Uniswap V3 with safety checks
     */
    function _getTWAPPrice() external view returns (uint256) {
        try this._calculateTWAP() returns (uint256 twapPrice) {
            if (twapPrice == 0) revert InvalidPrice();

            // Check TWAP hasn't moved too much from spot (prevents oracle manipulation)
            (uint160 sqrtPriceX96, , , , , , ) = UNISWAP_V3_POOL_WBTC_ETH
                .slot0();
            uint256 spotPrice = _sqrtPriceToPrice(sqrtPriceX96);

            uint256 priceDiff = spotPrice > twapPrice
                ? spotPrice - twapPrice
                : twapPrice - spotPrice;

            uint256 changePercent = (priceDiff * BASIS_POINTS) / spotPrice;
            if (changePercent > MAX_PRICE_CHANGE_PERCENT)
                revert PriceDeviation();

            return twapPrice;
        } catch {
            revert InvalidPrice();
        }
    }

    /**
     * @notice Calculate 10-minute TWAP from Uniswap V3
     */
    function _calculateTWAP() external view returns (uint256) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = uint32(TWAP_PERIOD);
        secondsAgos[1] = 0;

        (int56[] memory tickCumulatives, ) = UNISWAP_V3_POOL_WBTC_ETH.observe(
            secondsAgos
        );

        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 tick = int24(tickCumulativesDelta / int56(uint56(TWAP_PERIOD)));

        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);
        return _sqrtPriceToPrice(sqrtPriceX96);
    }

    /**
     * @notice Convert sqrt price to actual price
     */
    /**
     * @notice Convert Uniswap V3 sqrtPriceX96 to 8-decimal price format
     * @dev Safe implementation that avoids arithmetic overflow
     * @param sqrtPriceX96 The sqrt price in X96 format from Uniswap V3
     * @return price The price in 8 decimal format (oracle compatible)
     */
    function _sqrtPriceToPrice(
        uint160 sqrtPriceX96
    ) internal pure returns (uint256 price) {
        // Uniswap V3 price formula: price = (sqrtPriceX96 / 2^96)^2
        // Using FullMath to prevent overflow in intermediate calculations

        uint256 sqrtPrice = uint256(sqrtPriceX96);

        // Calculate sqrtPrice^2 / 2^192 safely using FullMath
        // We split: (sqrtPrice^2 * 10^8) / 2^192
        // = FullMath.mulDiv(sqrtPrice * sqrtPrice, 10^8, 2^192)
        // But sqrtPrice * sqrtPrice can overflow, so we do it in stages:
        // = FullMath.mulDiv(sqrtPrice, sqrtPrice, 2^96) * 10^8 / 2^96

        uint256 priceX96 = FullMath.mulDiv(sqrtPrice, sqrtPrice, 1 << 96);
        price = FullMath.mulDiv(priceX96, 10 ** 8, 1 << 96);

        return price;
    }
    /**
     * @notice Spot price for token pair from Uniswap V3 x Simplified for 2-asset model (WBTC + cbBTC) x For WBTC/cbBTC price, we use Chainlink BTC/USD (both track BTC ~1:1)
     */
    function _getSpotPrice(
        address _tokenA,
        address _tokenB
    ) internal view returns (uint256 spotPrice) {
        // For WBTC/cbBTC pairs, assume 1:1 peg (both are wrapped BTC)
        // Real price difference is minimal and handled by slippage tolerance
        if (
            (_tokenA == address(WBTC) && _tokenB == address(CBBTC)) ||
            (_tokenA == address(CBBTC) && _tokenB == address(WBTC))
        ) {
            // Return 1:1 ratio (1e8 for 8 decimal precision)
            return 1e8;
        } else {
            revert("Unsupported token pair");
        }
    }

    /**
     * @notice Get price from Uniswap V3 pool x Staleness check and precision handling
     */
    function _getPriceFromPool(
        IUniswapV3Pool pool,
        bool token0IsNumerator
    ) internal view returns (uint256) {
        (
            uint160 sqrtPriceX96,
            , // tick (unused)
            , // observationIndex (unused)
            uint16 observationCardinality,
            ,
            ,

        ) = pool.slot0();

        // Require sufficient observations for TWAP
        if (observationCardinality < 10) revert InvalidPrice();

        // Convert sqrt price to price
        uint256 price = _sqrtPriceToPrice(sqrtPriceX96);

        // Invert if needed
        if (!token0IsNumerator && price > 0) {
            price = (1e8 * 1e8) / price;
        }

        return price;
    }

    // ========================================================================
    //                    DYNAMIC GAS COST CALCULATION
    // ========================================================================

    /**
     * @notice Calculate dynamic gas cost in BTC
     * @return estimatedGasInBTC Gas cost in BTC (8 decimals)
     */
    function _calculateDynamicGasCostInBTC()
        internal
        returns (uint256 estimatedGasInBTC)
    {
        uint256 currentGasPrice = tx.gasprice;
        uint256 estimatedGasUsage = GAS_ESTIMATION_BASE + GAS_ESTIMATION_BUFFER;

        uint256 gasCostInWei = currentGasPrice * estimatedGasUsage;

        uint256 ethPriceUSD;
        try this._getChainlinkPrice(address(ETH_USD_ORACLE)) returns (
            uint256 price_
        ) {
            ethPriceUSD = price_;
        } catch {
            try this._getChainlinkPrice(fallbackEthOracle) returns (
                uint256 fallbackPrice
            ) {
                ethPriceUSD = fallbackPrice;
            } catch {
                // Fallback to safe assumption if both oracles fail
                ethPriceUSD = 2000e8; // $2000 ETH
            }
        }
        uint256 btcPriceUSD = getBTCPrice();

        if (btcPriceUSD == 0) revert InvalidPrice();

        // SafeMath for price conversion
        // Formula: (gasCostInWei / 1e18) * (ethPriceUSD / btcPriceUSD)
        estimatedGasInBTC = (gasCostInWei * ethPriceUSD) / (1e18 * btcPriceUSD);

        // Sanity check: gas cost shouldn't exceed 10 BTC because that's literally insane
        if (estimatedGasInBTC >= 10e8) revert AmountExceedsLimit();

        lastEstimatedGasInBTC = estimatedGasInBTC;
        emit GasCostCalculated(
            gasCostInWei,
            estimatedGasInBTC,
            block.timestamp
        );

        return estimatedGasInBTC;
    }

    // ========================================================================
    //                    MEV PROTECTION & VALIDATION
    // ========================================================================

    /**
     * @notice Validate swap price against oracle to detect MEV x Oracle-backed validation
     */
    function _validateSwapPrice(
        address _from,
        address _to,
        uint256 _amountIn,
        uint256 _expectedOut
    ) internal {
        // Get oracle spot price
        uint256 spotPrice = _getSpotPrice(_from, _to);

        // Calculate DEX implied price
        uint256 priceFromDEX = (_expectedOut * 1e8) / _amountIn;

        // Check deviation
        uint256 priceDiff = spotPrice > priceFromDEX
            ? spotPrice - priceFromDEX
            : priceFromDEX - spotPrice;

        uint256 deviationBps = (priceDiff * BASIS_POINTS) / spotPrice;

        emit OraclePriceUpdate(
            _from,
            spotPrice,
            priceFromDEX,
            deviationBps,
            block.timestamp
        );

        // MEV protection: revert if deviation too high
        if (deviationBps > TWAP_DEVIATION_THRESHOLD) {
            emit MEVProtectionTriggered(
                "DEX price deviation",
                spotPrice,
                priceFromDEX,
                deviationBps,
                block.timestamp
            );
            revert("MEV: price deviation exceeds threshold");
        }
    }

    // ========================================================================
    //                        CIRCUIT BREAKER SYSTEM
    // ========================================================================

    function _checkCircuitBreaker() internal {
        // Check for gradual recovery completion FIRST (runs even after CB is reset)
        if (gradualRecoveryActive) {
            if (
                block.timestamp >=
                lastFailedRebalance + circuitBreakerCooldown + 1 hours
            ) {
                dailySwapLimitBTC = preRecoveryDailyLimit;
                gradualRecoveryActive = false;
                emit DailyLimitReset(dailySwapLimitBTC, block.timestamp);
            }
        }

        // Then check if circuit breaker needs to be reset
        if (circuitBreakerTriggered) {
            if (
                block.timestamp >= lastFailedRebalance + circuitBreakerCooldown
            ) {
                // ONE-TIME limit reduction
                if (!gradualRecoveryActive) {
                    preRecoveryDailyLimit = dailySwapLimitBTC;
                    dailySwapLimitBTC = dailySwapLimitBTC / 2;
                    gradualRecoveryActive = true;
                    emit DailyLimitReset(dailySwapLimitBTC, block.timestamp);
                }

                circuitBreakerTriggered = false;
                failedRebalanceCount = 0;
                emit CircuitBreakerReset(block.timestamp);
            }
        }
    }

    function _handleRebalanceFailure(string memory reason) internal {
        failedRebalanceCount++;
        lastFailedRebalance = block.timestamp;
        totalRebalancesFailed++;

        emit RebalancingFailed(
            totalRebalancesFailed,
            block.timestamp,
            failedRebalanceCount,
            reason
        );

        if (failedRebalanceCount >= MAX_FAILED_REBALANCES) {
            circuitBreakerTriggered = true;
            rebalancingPaused = true;
            emit CircuitBreakerTriggered("MaxFail", block.timestamp);
        }
    }

    function getCircuitBreakerStatus()
        external
        view
        returns (
            bool isTriggered,
            uint256 failCount,
            uint256 timeSinceLastFailure,
            uint256 timeUntilReset
        )
    {
        isTriggered = circuitBreakerTriggered;
        failCount = failedRebalanceCount;
        timeSinceLastFailure = lastFailedRebalance > 0
            ? block.timestamp - lastFailedRebalance
            : 0;
        timeUntilReset = lastFailedRebalance > 0 && isTriggered
            ? lastFailedRebalance + circuitBreakerCooldown > block.timestamp
                ? (lastFailedRebalance + circuitBreakerCooldown) -
                    block.timestamp
                : 0
            : 0;
    }

    // ========================================================================
    //                        REBALANCING LOGIC
    // ========================================================================

    function _shouldRebalance() internal view returns (bool) {
        try this.getBTCPrice() returns (uint256) {
            // Oracle working
        } catch {
            return false;
        }
        (uint256 wbtcAlloc, uint256 cbbtcAlloc) = _getCurrentAllocations();
        // 50/50 target for 2-asset index
        uint256 targetAlloc = BASIS_POINTS / 2;

        uint256 wbtcDev = wbtcAlloc > targetAlloc
            ? wbtcAlloc - targetAlloc
            : targetAlloc - wbtcAlloc;
        uint256 cbbtcDev = cbbtcAlloc > targetAlloc
            ? cbbtcAlloc - targetAlloc
            : targetAlloc - cbbtcAlloc;

        return wbtcDev > rebalanceThreshold || cbbtcDev > rebalanceThreshold;
    }

    /**
     * @notice Execute rebalance with comprehensive safety checks
     */
    function _executeRebalance() internal {
        uint256 totalBalance = _calculateTotalHoldings();
        if (totalBalance == 0) return;

        // Validate position size
        if (totalBalance < minPositionSize) revert PositionTooSmall();
        if (totalBalance > maxPositionSize) revert PositionTooLarge();

        // Dynamic gas cost
        uint256 dynamicGasCost = _calculateDynamicGasCostInBTC();

        // 50/50 split for 2-asset index
        uint256 targetPerAsset = totalBalance / 2;

        uint256 wbtcBalance = WBTC.balanceOf(address(this));
        uint256 cbbtcBalance = CBBTC.balanceOf(address(this));

        int256 wbtcDelta = int256(wbtcBalance) - int256(targetPerAsset);
        int256 cbbtcDelta = int256(cbbtcBalance) - int256(targetPerAsset);

        uint256 totalImbalance = _abs(wbtcDelta) + _abs(cbbtcDelta);

        // Profitability check with dynamic gas
        if (totalImbalance < (dynamicGasCost + minArbitrageProfit)) {
            return;
        }

        _resetDailySwapLimit();

        // Simple 2-asset rebalancing: swap excess from one to the other
        if (wbtcDelta > 0 && cbbtcDelta < 0) {
            // Too much WBTC, too little cbBTC - swap WBTC to cbBTC
            uint256 toSwap = Math.min(uint256(wbtcDelta), uint256(-cbbtcDelta));
            if (!_trySwapWithLimit(address(WBTC), address(CBBTC), toSwap)) {
                return;
            }
        } else if (cbbtcDelta > 0 && wbtcDelta < 0) {
            // Too much cbBTC, too little WBTC - swap cbBTC to WBTC
            uint256 toSwap = Math.min(uint256(cbbtcDelta), uint256(-wbtcDelta));
            if (!_trySwapWithLimit(address(CBBTC), address(WBTC), toSwap)) {
                return;
            }
        }

        emit RebalancingCompleted(
            totalRebalancesExecuted,
            block.timestamp,
            totalImbalance,
            dynamicGasCost
        );
    }

    /**
     * @notice Try swap with limit checking
     */
    function _trySwapWithLimit(
        address _from,
        address _to,
        uint256 _amount
    ) internal returns (bool success) {
        // Check daily limit
        if (dailySwapVolumeUsed + _amount > dailySwapLimitBTC) {
            emit RateLimitExceeded(
                "DayLimit",
                dailySwapLimitBTC,
                block.timestamp
            );
            return false;
        }

        // Check rate limit
        if (block.timestamp < lastSwapTime + minSwapInterval) {
            emit RateLimitExceeded("SwapInt", minSwapInterval, block.timestamp);
            return false;
        }

        try this._swapWithProfitCheckInternal(_from, _to, _amount) {
            dailySwapVolumeUsed += _amount;
            lastSwapTime = block.timestamp;
            totalSwapsExecuted++;
            return true;
        } catch Error(string memory reason) {
            totalSwapsFailed++;
            emit RebalancingFailed(
                totalSwapsFailed,
                block.timestamp,
                failedRebalanceCount,
                reason
            );
            return false;
        }
    }

    function _resetDailySwapLimit() internal {
        if (block.timestamp >= swapLimitResetTime) {
            dailySwapVolumeUsed = 0;
            swapLimitResetTime = block.timestamp + 1 days;
        }
    }

    function _swapWithProfitCheckInternal(
        address _from,
        address _to,
        uint256 _amount
    ) external {
        if (msg.sender != address(this)) revert InternalOnly();
        _swapWithProfitCheck(_from, _to, _amount);
    }

    /**
     * @notice Execute swap with MEV protection
     */
    function _swapWithProfitCheck(
        address _from,
        address _to,
        uint256 _amount
    ) internal nonReentrant {
        if (_amount == 0 || _from == _to) return;

        if (_amount > maxApprovalPerSwap) revert AmountExceedsLimit();

        _issueTimeLimitedApproval(
            IERC20(_from),
            address(AERODROME_ROUTER),
            _amount
        );
        _issueTimeLimitedApproval(
            IERC20(_from),
            address(UNISWAP_ROUTER),
            _amount
        );

        address[] memory path = new address[](2);
        path[0] = _from;
        path[1] = _to;

        uint256[] memory aerodromeAmounts = AERODROME_ROUTER.getAmountsOut(
            _amount,
            path
        );
        uint256[] memory uniswapAmounts = UNISWAP_ROUTER.getAmountsOut(
            _amount,
            path
        );

        uint256 expectedOut = Math.max(aerodromeAmounts[1], uniswapAmounts[1]);
        IDEXRouter selectedRouter = aerodromeAmounts[1] > uniswapAmounts[1]
            ? AERODROME_ROUTER
            : UNISWAP_ROUTER;

        // MEV validation
        _validateSwapPrice(_from, _to, _amount, expectedOut);

        // Slippage protection
        uint256 minOut = (expectedOut * (BASIS_POINTS - maxSlippage)) /
            BASIS_POINTS;

        // Profitability check using configurable swapFee
        uint256 breakEven = (_amount * (BASIS_POINTS - swapFee)) / BASIS_POINTS;
        if (minOut < breakEven + minArbitrageProfit) revert SlippageExceeded();

        uint256 balanceBefore = IERC20(_to).balanceOf(address(this));

        // Execute
        selectedRouter.swapExactTokensForTokens(
            _amount,
            minOut,
            path,
            address(this),
            block.timestamp + 60
        );

        uint256 balanceAfter = IERC20(_to).balanceOf(address(this));
        uint256 actualOut = balanceAfter - balanceBefore;

        if (actualOut < minOut) revert SlippageExceeded();

        uint256 profit = actualOut > _amount ? actualOut - _amount : 0;
        uint256 slippageUsed = expectedOut > actualOut
            ? expectedOut - actualOut
            : 0;

        // Revoke approvals
        _revokeApproval(IERC20(_from), address(AERODROME_ROUTER));
        _revokeApproval(IERC20(_from), address(UNISWAP_ROUTER));

        emit SwapExecuted(
            _from,
            _to,
            _amount,
            actualOut,
            slippageUsed,
            _getSpotPrice(_from, _to),
            expectedOut,
            block.timestamp
        );
        emit Rebalanced(
            _from,
            _to,
            _amount,
            actualOut,
            profit,
            block.timestamp
        );
    }

    /**
     * @notice Emergency swap with higher slippage tolerance
     */
    function _swapEmergency(
        address _from,
        address _to,
        uint256 _amount
    ) internal nonReentrant {
        if (_amount == 0 || _from == _to) return;

        _issueTimeLimitedApproval(
            IERC20(_from),
            address(AERODROME_ROUTER),
            _amount
        );
        _issueTimeLimitedApproval(
            IERC20(_from),
            address(UNISWAP_ROUTER),
            _amount
        );

        address[] memory path = new address[](2);
        path[0] = _from;
        path[1] = _to;

        uint256[] memory aerodromeAmounts = AERODROME_ROUTER.getAmountsOut(
            _amount,
            path
        );
        uint256[] memory uniswapAmounts = UNISWAP_ROUTER.getAmountsOut(
            _amount,
            path
        );

        uint256 expectedOut = Math.max(aerodromeAmounts[1], uniswapAmounts[1]);
        IDEXRouter router = aerodromeAmounts[1] > uniswapAmounts[1]
            ? AERODROME_ROUTER
            : UNISWAP_ROUTER;

        uint256 minOut = (expectedOut * (BASIS_POINTS - EMERGENCY_SLIPPAGE)) /
            BASIS_POINTS;

        router.swapExactTokensForTokens(
            _amount,
            minOut,
            path,
            address(this),
            block.timestamp + 60
        );

        _revokeApproval(IERC20(_from), address(AERODROME_ROUTER));
        _revokeApproval(IERC20(_from), address(UNISWAP_ROUTER));
    }

    function _executeRebalanceInternal() external {
        if (msg.sender != address(this)) revert InternalOnly();
        _executeRebalance();
    }

    // ========================================================================
    //                    APPROVAL MANAGEMENT
    // ========================================================================

    /**
     * @notice Issue time-limited approval for swap
     */
    function _issueTimeLimitedApproval(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        if (amount > maxApprovalPerSwap) revert AmountExceedsLimit();
        if (amount == 0) revert AmountIsZero();

        uint256 expiryTime = block.timestamp + 1 hours;

        // Atomic clear and issue
        token.forceApprove(spender, 0);
        token.forceApprove(spender, amount);

        swapApprovals[address(token)][spender] = amount;
        approvalTimestamps[address(token)][spender] = expiryTime;
        approvalExpired[address(token)][spender] = false;

        emit ApprovalIssued(
            address(token),
            spender,
            amount,
            expiryTime,
            block.timestamp
        );
    }

    /**
     * @notice Revoke approval
     */
    function _revokeApproval(IERC20 token, address spender) internal {
        token.forceApprove(spender, 0);
        swapApprovals[address(token)][spender] = 0;
        approvalTimestamps[address(token)][spender] = 0;
        approvalExpired[address(token)][spender] = true;

        emit ApprovalRevoked(address(token), spender, block.timestamp);
    }

    /**
     * @notice Revoke all approvals in emergency
     */
    function _revokeAllApprovals() internal {
        _revokeApproval(WBTC, address(AERODROME_ROUTER));
        _revokeApproval(WBTC, address(UNISWAP_ROUTER));
        _revokeApproval(CBBTC, address(AERODROME_ROUTER));
        _revokeApproval(CBBTC, address(UNISWAP_ROUTER));
    }

    // ========================================================================
    //                            HELPER FUNCTIONS
    // ========================================================================

    function _swapIfNeeded(
        address _from,
        address _to,
        uint256 _amount,
        bool _isEmergency
    ) internal {
        if (_from != _to && _amount > 0) {
            if (_isEmergency) {
                _swapEmergency(_from, _to, _amount);
            } else {
                _swapWithProfitCheck(_from, _to, _amount);
            }
        }
    }

    function _getCurrentAllocations()
        internal
        view
        returns (uint256 wbtcAlloc, uint256 cbbtcAlloc)
    {
        uint256 totalBalance = _calculateTotalHoldings();
        if (totalBalance == 0) return (0, 0);

        uint256 wbtcBalance = WBTC.balanceOf(address(this));
        uint256 cbbtcBalance = CBBTC.balanceOf(address(this));

        wbtcAlloc = (wbtcBalance * BASIS_POINTS) / totalBalance;
        cbbtcAlloc = (cbbtcBalance * BASIS_POINTS) / totalBalance;
    }

    function _calculateTotalHoldings() internal view returns (uint256) {
        return
            WBTC.balanceOf(address(this)) +
            CBBTC.balanceOf(address(this)) +
            asset.balanceOf(address(this));
    }

    function _abs(int256 x) internal pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }

    // ========================================================================
    //                    MANAGEMENT & ADMIN FUNCTIONS (CONTINUED)
    // ========================================================================

    /**
     * @notice Update fallback oracles
     */
    function setFallbackOracles(
        address _btcOracle,
        address _ethOracle
    ) external onlyManagement {
        if (_btcOracle == address(0)) revert ZeroAddress();
        if (_ethOracle == address(0)) revert ZeroAddress();
        if (_btcOracle == address(BTC_USD_ORACLE)) revert SameAddress();
        if (_ethOracle == address(ETH_USD_ORACLE)) revert SameAddress();

        fallbackBtcOracle = _btcOracle;
        fallbackEthOracle = _ethOracle;
    }

    /**
     * @notice Pause rebalancing (emergency)
     */
    function pauseRebalancing() external onlyEmergencyAuthorized {
        if (rebalancingPaused) revert AlreadyPaused();
        rebalancingPaused = true;
        emit EmergencyAction("Paused", block.timestamp);
    }

    /**
     * @notice Unpause rebalancing
     */
    function unpauseRebalancing() external onlyManagement {
        if (!rebalancingPaused) revert NotPaused();
        rebalancingPaused = false;
        emit EmergencyAction("Unpaused", block.timestamp);
    }

    /**
     * @notice Reset circuit breaker (only after cooldown)
     */
    function resetCircuitBreaker() external onlyManagement {
        if (block.timestamp < lastFailedRebalance + circuitBreakerCooldown)
            revert BelowMinimum();
        circuitBreakerTriggered = false;
        failedRebalanceCount = 0;
        emit CircuitBreakerReset(block.timestamp);
    }

    /**
     * @notice Enable oracle failure mode (use fallback oracles)
     */
    function enableOracleFailureMode() external onlyEmergencyAuthorized {
        if (oracleFailureMode) revert AlreadyInFailureMode();
        oracleFailureMode = true;
        emit OracleModeChanged(true, block.timestamp);
        emit EmergencyAction("OracleFailOn", block.timestamp);
    }

    /**
     * @notice Disable oracle failure mode (resume normal operation)
     */
    function disableOracleFailureMode() external onlyManagement {
        if (!oracleFailureMode) revert NotInFailureMode();
        oracleFailureMode = false;
        emit OracleModeChanged(false, block.timestamp);
        emit EmergencyAction("OracleFailOff", block.timestamp);
    }

    /**
     * @notice Set swap fee for profitability calculations
     * @param _newFee Fee in basis points (e.g., 25 = 0.25%)
     * @dev Bounded between 5 bps (0.05%) and 100 bps (1%)
     */
    function setSwapFee(uint256 _newFee) external onlyManagement {
        if (_newFee < 5) revert BelowMinimum();
        if (_newFee > 100) revert ExceedsMaximum();
        swapFee = _newFee;
        emit ParametersUpdated(
            depositCap,
            rebalanceThreshold,
            minArbitrageProfit,
            block.timestamp
        );
    }

    /**
     * @notice Update deposit cap within allowed bounds
     * @param _newCap New deposit cap in BTC with 8 decimals (e.g., 100e8 = 100 BTC)
     * @dev Bounded by MIN_DEPOSIT_CAP (1 BTC) and MAX_DEPOSIT_CAP (1000 BTC)
     */
    function setDepositCap(uint256 _newCap) external onlyManagement {
        if (_newCap < MIN_DEPOSIT_CAP) revert BelowMinimum();
        if (_newCap > MAX_DEPOSIT_CAP) revert ExceedsMaximum();

        depositCap = _newCap;

        emit ParametersUpdated(
            depositCap,
            rebalanceThreshold,
            minArbitrageProfit,
            block.timestamp
        );
    }

    /**
     * @notice Set maximum slippage for swaps
     * @param _newSlippage New slippage in basis points (e.g., 100 = 1%)
     * @dev Bounded between 10 bps (0.1%) and 500 bps (5%)
     */
    function setMaxSlippage(uint256 _newSlippage) external onlyManagement {
        if (_newSlippage < 10) revert BelowMinimum();
        if (_newSlippage > 1000) revert ExceedsMaximum(); // 10% max for market stress

        maxSlippage = _newSlippage;

        emit ParametersUpdated(
            depositCap,
            rebalanceThreshold,
            minArbitrageProfit,
            block.timestamp
        );
    }

    // ========================================================================
    //                            MONITORING & STATUS
    // ========================================================================

    /**
     * @notice Get comprehensive strategy status
     */
    function getStrategyStatus()
        external
        view
        returns (StrategyStatus memory status)
    {
        // Scope 1: Holdings & Allocations
        {
            uint256 total = _calculateTotalHoldings();
            status.totalHoldings = total;

            (status.wbtcAlloc, status.cbbtcAlloc) = _getCurrentAllocations();
        }

        // Scope 2: Circuit Breaker
        {
            (bool cb, uint256 fails, , uint256 resetTime) = this
                .getCircuitBreakerStatus();
            status.isCBTriggered = cb;
            status.failCount = fails;
            status.timeUntilReset = resetTime;
        }

        // Scope 3: State Variables
        status.isPaused = rebalancingPaused;
        status.isInOracleFailureMode = oracleFailureMode;
        status.dailySwapUsed = dailySwapVolumeUsed;
        status.dailySwapLimit = dailySwapLimitBTC;
        status.lastGasCost = lastEstimatedGasInBTC;
        status.rebalancesExecuted = totalRebalancesExecuted;
        status.rebalancesFailed = totalRebalancesFailed;
        status.swapsExecuted = totalSwapsExecuted;
        status.swapsFailed = totalSwapsFailed;
    }

    /**
     * @notice Get detailed allocation status
     */
    function getAllocationDetails()
        external
        view
        returns (
            uint256 wbtcBalance,
            uint256 cbbtcBalance,
            uint256 assetBalance,
            uint256 totalBalance,
            uint256 wbtcPercent,
            uint256 cbbtcPercent,
            uint256 assetPercent
        )
    {
        wbtcBalance = WBTC.balanceOf(address(this));
        cbbtcBalance = CBBTC.balanceOf(address(this));
        assetBalance = asset.balanceOf(address(this));
        totalBalance = wbtcBalance + cbbtcBalance + assetBalance;

        if (totalBalance > 0) {
            wbtcPercent = (wbtcBalance * BASIS_POINTS) / totalBalance;
            cbbtcPercent = (cbbtcBalance * BASIS_POINTS) / totalBalance;
            assetPercent = (assetBalance * BASIS_POINTS) / totalBalance;
        }
    }

    /**
     * @notice Get rate limit status
     */
    function getRateLimitStatus()
        external
        view
        returns (
            uint256 dailySwapUsed,
            uint256 dailySwapLimit,
            uint256 timeUntilDailyReset,
            uint256 timeSinceLastRebalance,
            uint256 minRebalanceIntervalSec,
            uint256 timeSinceLastSwap,
            uint256 minSwapIntervalSec
        )
    {
        dailySwapUsed = dailySwapVolumeUsed;
        dailySwapLimit = dailySwapLimitBTC;
        timeUntilDailyReset = swapLimitResetTime > block.timestamp
            ? swapLimitResetTime - block.timestamp
            : 0;
        timeSinceLastRebalance = lastRebalanceTime > 0
            ? block.timestamp - lastRebalanceTime
            : 0;
        minRebalanceIntervalSec = minRebalanceInterval;
        timeSinceLastSwap = lastSwapTime > 0
            ? block.timestamp - lastSwapTime
            : 0;
        minSwapIntervalSec = minSwapInterval;
    }

    /**
     * @notice Get approval status
     */
    function getApprovalStatus(
        address token,
        address spender
    )
        external
        view
        returns (
            uint256 currentAllowance,
            uint256 issuedAmount,
            uint256 expiryTime,
            bool hasExpired,
            uint256 timeUntilExpiry
        )
    {
        currentAllowance = IERC20(token).allowance(address(this), spender);
        issuedAmount = swapApprovals[token][spender];
        expiryTime = approvalTimestamps[token][spender];
        hasExpired = approvalExpired[token][spender];

        if (expiryTime > block.timestamp) {
            timeUntilExpiry = expiryTime - block.timestamp;
        } else {
            timeUntilExpiry = 0;
        }
    }

    /**
     * @notice Get oracle status
     */
    function getOracleStatus()
        external
        view
        returns (
            uint256 btcPriceUSD,
            uint256 ethPriceUSD,
            bool primaryBtcOracleHealthy,
            bool primaryEthOracleHealthy,
            bool inFailureMode
        )
    {
        try this.getBTCPrice() returns (uint256 btcPrice) {
            btcPriceUSD = btcPrice;
            primaryBtcOracleHealthy = true;
        } catch {
            btcPriceUSD = 0;
            primaryBtcOracleHealthy = false;
        }
        try this._getChainlinkPrice(address(ETH_USD_ORACLE)) returns (
            uint256 ethPrice
        ) {
            ethPriceUSD = ethPrice;
            primaryEthOracleHealthy = true;
        } catch {
            ethPriceUSD = 0;
            primaryEthOracleHealthy = false;
        }
        inFailureMode = oracleFailureMode;
    }

    /**
     * @notice Estimate profitability of rebalance
     */
    function estimateRebalanceProfitability()
        external
        returns (
            bool isProfitable,
            uint256 estimatedGasCost,
            uint256 minImbalanceRequired,
            uint256 currentImbalance
        )
    {
        estimatedGasCost = _calculateDynamicGasCostInBTC();

        minImbalanceRequired = estimatedGasCost + minArbitrageProfit;

        (uint256 wbtcAlloc, uint256 cbbtcAlloc) = _getCurrentAllocations();
        // 50/50 target for 2-asset index
        uint256 targetAlloc = BASIS_POINTS / 2;

        uint256 wbtcDev = wbtcAlloc > targetAlloc
            ? wbtcAlloc - targetAlloc
            : targetAlloc - wbtcAlloc;
        uint256 cbbtcDev = cbbtcAlloc > targetAlloc
            ? cbbtcAlloc - targetAlloc
            : targetAlloc - cbbtcAlloc;

        currentImbalance = wbtcDev + cbbtcDev;

        isProfitable = currentImbalance >= minImbalanceRequired;
    }

    // ========================================================================
    //                        ADVANCED MONITORING
    // ========================================================================

    /**
     * @notice Get swap execution statistics
     */
    function getSwapStatistics()
        external
        view
        returns (
            uint256 totalExecuted,
            uint256 totalFailed,
            uint256 successRate,
            uint256 lastSwapTimestamp,
            uint256 dailyVolumeUsed,
            uint256 dailyVolumeLimit
        )
    {
        totalExecuted = totalSwapsExecuted;
        totalFailed = totalSwapsFailed;

        if (totalExecuted + totalFailed > 0) {
            successRate =
                (totalExecuted * BASIS_POINTS) /
                (totalExecuted + totalFailed);
        }

        lastSwapTimestamp = lastSwapTime;
        dailyVolumeUsed = dailySwapVolumeUsed;
        dailyVolumeLimit = dailySwapLimitBTC;
    }

    /**
     * @notice Get rebalance execution statistics
     */
    function getRebalanceStatistics()
        external
        view
        returns (
            uint256 totalExecuted,
            uint256 totalFailed,
            uint256 successRate,
            uint256 lastRebalanceTimestamp,
            uint256 minIntervalRequired,
            uint256 timeSinceLastRebalance
        )
    {
        totalExecuted = totalRebalancesExecuted;
        totalFailed = totalRebalancesFailed;

        if (totalExecuted + totalFailed > 0) {
            successRate =
                (totalExecuted * BASIS_POINTS) /
                (totalExecuted + totalFailed);
        }

        lastRebalanceTimestamp = lastRebalanceTime;
        minIntervalRequired = minRebalanceInterval;
        timeSinceLastRebalance = lastRebalanceTime > 0
            ? block.timestamp - lastRebalanceTime
            : 0;
    }

    /**
     * @notice Get emergency withdrawal statistics
     */
    function getEmergencyWithdrawalStatus()
        external
        view
        returns (
            uint256 totalEmergencyWithdrawals,
            uint256 lastEmergencyWithdrawalTime,
            bool isCurrentlyActive,
            uint256 timeSinceLastEmergency
        )
    {
        totalEmergencyWithdrawals = emergencyWithdrawCount;
        lastEmergencyWithdrawalTime = lastEmergencyWithdraw;
        isCurrentlyActive = emergencyWithdrawActive;
        timeSinceLastEmergency = lastEmergencyWithdraw > 0
            ? block.timestamp - lastEmergencyWithdraw
            : 0;
    }

    /**
     * @notice Get comprehensive system diagnostics
     */
    function getSystemDiagnostics()
        external
        view
        returns (
            bool systemHealthy,
            bool oraclesOperational,
            bool routersOperational,
            bool approvalsValid,
            bool positionSizeValid,
            string memory overallStatus
        )
    {
        // Check oracles
        bool oraclesOp = true;
        try this.getBTCPrice() returns (uint256) {
            oraclesOp = true;
        } catch {
            oraclesOp = false;
        }
        // Check position size
        uint256 totalHoldings = _calculateTotalHoldings();
        bool positionOk = totalHoldings >= minPositionSize &&
            totalHoldings <= maxPositionSize;

        // Check if paused
        bool approvalsOk = !emergencyWithdrawActive;

        // Check routers
        bool routersOp = true;
        try this._checkRouterHealth() returns (bool healthy) {
            routersOp = healthy;
        } catch {
            routersOp = false;
        }
        systemHealthy = oraclesOp && routersOp && positionOk && approvalsOk;

        // Determine overall status
        string memory status;
        if (circuitBreakerTriggered) {
            status = "CIRCUIT_BREAKER_ACTIVE";
        } else if (rebalancingPaused) {
            status = "PAUSED";
        } else if (systemHealthy) {
            status = "HEALTHY";
        } else if (oracleFailureMode) {
            status = "DEGRADED_MODE";
        } else {
            status = "UNHEALTHY";
        }

        return (
            systemHealthy,
            oraclesOp,
            routersOp,
            approvalsOk,
            positionOk,
            status
        );
    }

    /**
     * @notice Calculate estimated daily profit
     */
    function estimateDailyProfit()
        external
        view
        returns (
            uint256 estimatedProfitBTC,
            uint256 estimatedProfitUSD,
            uint256 annualizedAPY,
            uint256 dataPoints
        )
    {
        uint256 totalHoldings = _calculateTotalHoldings();

        if (totalHoldings == 0) {
            return (0, 0, 0, 0);
        }

        // Base estimate on min profit per rebalance
        // Assume rebalance happens every 1 hour = 24 rebalances/day
        uint256 estimatedRebalancesPerDay = 24;
        estimatedProfitBTC = minArbitrageProfit * estimatedRebalancesPerDay;

        // Convert to USD using actual oracle price
        uint256 btcPriceUSD = getBTCPrice();
        estimatedProfitUSD = (estimatedProfitBTC * btcPriceUSD) / 1e8;

        // Calculate APY
        uint256 annualProfit = estimatedProfitBTC * 365;
        annualizedAPY = (annualProfit * BASIS_POINTS) / totalHoldings;

        dataPoints = totalRebalancesExecuted + totalSwapsExecuted;
    }

    /**
     * @notice Get next expected rebalance time
     */
    function getNextRebalanceTime()
        external
        view
        returns (
            uint256 nextRebalanceTime,
            uint256 secondsUntilNextRebalance,
            bool rebalanceReady,
            string memory reason
        )
    {
        nextRebalanceTime = lastRebalanceTime + minRebalanceInterval;

        if (block.timestamp >= nextRebalanceTime) {
            secondsUntilNextRebalance = 0;
        } else {
            secondsUntilNextRebalance = nextRebalanceTime - block.timestamp;
        }

        if (rebalancingPaused) {
            rebalanceReady = false;
            reason = "PAUSED";
        } else if (circuitBreakerTriggered) {
            rebalanceReady = false;
            reason = "CIRCUIT_BREAKER_ACTIVE";
        } else if (secondsUntilNextRebalance > 0) {
            rebalanceReady = false;
            reason = "RATE_LIMIT_ACTIVE";
        } else if (!_shouldRebalance()) {
            rebalanceReady = false;
            reason = "ALLOCATION_IN_TOLERANCE";
        } else {
            rebalanceReady = true;
            reason = "READY";
        }
    }

    // ========================================================================
    //                        CLOSING BRACE
    // ========================================================================
}

// "For what shall it profit a man, if he shall gain the whole world, and lose his own soul?" - Mark 8:36 (KJV)

// “No one can serve two masters. For you will hate one and love the other; you will be devoted to one and despise the other. You cannot serve God and be enslaved to money." - Matthew 6:24 (NLT)

// “For God so loved the world, that He gave his only Son, that whoever believes in Him should not perish but have eternal life.” - John 3:16 (ESV)

// "if you acknowledge and confess with your mouth that Jesus is Lord [recognizing His power, authority, and majesty as God], and believe in your heart that God raised Him from the dead, you will be saved." - Romans 10:9 (AMP)

// Repent, for the Kingdom of Heaven is at hand.

// Jesus loves you, and so does Jubilee Labs. Grace and peace.

// P.S. Seek first the Kingdom of God! Matthew 6:33
