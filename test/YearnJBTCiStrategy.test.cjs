/**
 * YearnJBTCiStrategy Test Suite
 * 
 * Part 1: Mock Contracts Sanity Checks (local Hardhat)
 * Part 2: Live Testnet Contract Verification
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("YearnJBTCiStrategy - Mock Contracts", function () {
    let cbBTC, wBTC, usdc, weth;
    let btcOracle, ethOracle;
    let aerodromeRouter;
    let poolWbtcEth;
    let owner, user1;

    const SQRT_PRICE_1_1 = BigInt("79228162514264337593543950336");

    beforeEach(async function () {
        const signers = await ethers.getSigners();
        owner = signers[0];
        user1 = signers[1];

        // Deploy mock tokens
        const MockERC20 = await ethers.getContractFactory("MockCBBTC");
        cbBTC = await MockERC20.deploy();
        wBTC = await MockERC20.deploy();
        usdc = await MockERC20.deploy();
        weth = await MockERC20.deploy();

        // Deploy mock oracles (BTC @ $100K, ETH @ $4K)
        const MockOracle = await ethers.getContractFactory("MockChainlinkOracle");
        btcOracle = await MockOracle.deploy(10000000000000n, 8);
        ethOracle = await MockOracle.deploy(400000000000n, 8);

        // Deploy mock router
        const MockRouter = await ethers.getContractFactory("MockRouter");
        aerodromeRouter = await MockRouter.deploy();

        // Deploy mock V3 pool
        const MockPool = await ethers.getContractFactory("MockUniswapV3Pool");
        poolWbtcEth = await MockPool.deploy(
            await wBTC.getAddress(),
            await weth.getAddress(),
            SQRT_PRICE_1_1
        );
    });

    describe("Mock Token Tests", function () {
        it("should deploy ERC20 tokens", async function () {
            expect(await cbBTC.getAddress()).to.not.equal(ethers.ZeroAddress);
            expect(await wBTC.getAddress()).to.not.equal(ethers.ZeroAddress);
        });

        it("should mint tokens correctly", async function () {
            const amount = ethers.parseUnits("100", 8);
            await cbBTC.mint(user1.address, amount);

            const balance = await cbBTC.balanceOf(user1.address);
            expect(balance).to.equal(amount);
        });
    });

    describe("Mock Oracle Tests", function () {
        it("should return correct BTC price", async function () {
            const data = await btcOracle.latestRoundData();
            expect(data[1]).to.equal(10000000000000n); // $100,000 in 8 decimals
        });

        it("should return correct ETH price", async function () {
            const data = await ethOracle.latestRoundData();
            expect(data[1]).to.equal(400000000000n); // $4,000 in 8 decimals
        });
    });

    describe("Mock Router Tests", function () {
        it("should return 1:1 amounts from getAmountsOut", async function () {
            const path = [await cbBTC.getAddress(), await wBTC.getAddress()];
            const amount = ethers.parseUnits("1", 8);
            const amounts = await aerodromeRouter.getAmountsOut(amount, path);

            expect(amounts[0]).to.equal(amount);
            expect(amounts[1]).to.equal(amount);
        });
    });

    describe("Mock Pool Tests", function () {
        it("should return correct slot0 data", async function () {
            const slot0 = await poolWbtcEth.slot0();
            expect(slot0[0]).to.equal(SQRT_PRICE_1_1);
            expect(slot0[3]).to.equal(100); // observationCardinality
        });

        it("should return correct token addresses", async function () {
            const token0 = await poolWbtcEth.token0();
            const token1 = await poolWbtcEth.token1();

            expect(token0).to.equal(await wBTC.getAddress());
            expect(token1).to.equal(await weth.getAddress());
        });

        it("should return observe data for TWAP", async function () {
            const result = await poolWbtcEth.observe([1800, 0]);
            expect(result.tickCumulatives.length).to.equal(2);
        });
    });
});

describe("YearnJBTCiStrategy - Live Testnet", function () {
    const TESTNET_STRATEGY = "0x43814Da4b3CB4344395A85afF2325282A43cbda6";
    let provider, strategy;

    before(async function () {
        provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

        const abi = [
            "function getStrategyStatus() view returns (tuple(bool isPaused, bool isCBTriggered, bool isInOracleFailureMode, uint256 totalHoldings, uint256 dailySwapUsed, uint256 dailySwapLimit, uint256 lastGasCost, uint256 rebalancesExecuted, uint256 rebalancesFailed, uint256 swapsExecuted, uint256 swapsFailed, uint256 wbtcAlloc, uint256 cbbtcAlloc, uint256 failCount, uint256 timeUntilReset))",
            "function getAllocationDetails() view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
            "function depositCap() view returns (uint256)",
            "function maxSlippage() view returns (uint256)",
            "function swapFee() view returns (uint256)",
        ];

        strategy = new ethers.Contract(TESTNET_STRATEGY, abi, provider);
    });

    describe("Bug Fix Verification", function () {
        it("should have assetBalance = 0 (no double-counting)", async function () {
            const details = await strategy.getAllocationDetails();
            expect(details[2]).to.equal(0n);
        });
    });

    describe("Bounds Validation", function () {
        it("should have valid deposit cap", async function () {
            const cap = await strategy.depositCap();
            expect(cap).to.be.gte(1n * 10n ** 8n);
            expect(cap).to.be.lte(1000n * 10n ** 8n);
        });

        it("should have valid slippage", async function () {
            const slippage = await strategy.maxSlippage();
            expect(slippage).to.be.gte(10);
            expect(slippage).to.be.lte(1000);
        });

        it("should have valid swap fee", async function () {
            const fee = await strategy.swapFee();
            expect(fee).to.be.gte(5);
            expect(fee).to.be.lte(100);
        });
    });

    describe("Status Check", function () {
        it("should return strategy status without error", async function () {
            const status = await strategy.getStrategyStatus();
            expect(status.isPaused).to.be.a("boolean");
            expect(status.isCBTriggered).to.be.a("boolean");
        });
    });
});
