const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("YearnJBTCiStrategy", function () {
    let strategy;
    let cbBTC, wBTC;
    let owner, user1, user2;
    let mockOracle;

    const INITIAL_SUPPLY = ethers.parseUnits("1000", 8); // 1000 BTC
    const DEPOSIT_AMOUNT = ethers.parseUnits("10", 8); // 10 BTC

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy mock tokens
        const MockERC20 = await ethers.getContractFactory("MockCBBTC");
        cbBTC = await MockERC20.deploy();
        wBTC = await MockERC20.deploy();

        // Deploy mock oracle
        const MockOracle = await ethers.getContractFactory("MockChainlinkOracle");
        mockOracle = await MockOracle.deploy(
            ethers.parseUnits("95000", 8), // BTC price $95,000
            8 // decimals
        );

        // Deploy mock router
        const MockRouter = await ethers.getContractFactory("MockRouter");
        const mockRouter = await MockRouter.deploy();

        // Deploy TokenizedStrategy (required by BaseStrategy)
        const TokenizedStrategy = await ethers.getContractFactory("TokenizedStrategy");
        const tokenizedStrategy = await TokenizedStrategy.deploy(await owner.getAddress());

        // Deploy the strategy
        const Strategy = await ethers.getContractFactory("YearnJBTCiStrategy");
        strategy = await Strategy.deploy(
            await cbBTC.getAddress(),    // asset (cbBTC)
            await wBTC.getAddress(),     // wBTC
            await mockOracle.getAddress(), // BTC oracle
            await mockOracle.getAddress(), // ETH oracle (using same mock)
            await mockRouter.getAddress(), // Router
            "0x0000000000000000000000000000000000000001", // Placeholder pool
            await tokenizedStrategy.getAddress()
        );

        // Mint tokens to users
        await cbBTC.mint(user1.address, INITIAL_SUPPLY);
        await cbBTC.mint(user2.address, INITIAL_SUPPLY);
        await wBTC.mint(await strategy.getAddress(), ethers.parseUnits("50", 8)); // Give strategy some WBTC

        // Approve strategy to spend tokens
        await cbBTC.connect(user1).approve(await strategy.getAddress(), ethers.MaxUint256);
        await cbBTC.connect(user2).approve(await strategy.getAddress(), ethers.MaxUint256);
    });

    describe("Critical Bug Test: Double-Counting Prevention", function () {
        it("should NOT double-count cbBTC in _calculateTotalHoldings", async function () {
            // Deposit cbBTC
            await strategy.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

            // Get strategy status
            const status = await strategy.getStrategyStatus();

            // The totalHoldings should equal cbBTC + WBTC, NOT cbBTC + WBTC + asset
            const cbbtcBalance = await cbBTC.balanceOf(await strategy.getAddress());
            const wbtcBalance = await wBTC.balanceOf(await strategy.getAddress());
            const expectedTotal = cbbtcBalance + wbtcBalance;

            expect(status.totalHoldings).to.equal(expectedTotal);
            console.log(`    Total Holdings: ${ethers.formatUnits(status.totalHoldings, 8)} BTC`);
            console.log(`    cbBTC Balance: ${ethers.formatUnits(cbbtcBalance, 8)}`);
            console.log(`    WBTC Balance: ${ethers.formatUnits(wbtcBalance, 8)}`);
        });

        it("should have allocations that add up to exactly 100%", async function () {
            // Deposit cbBTC
            await strategy.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

            const status = await strategy.getStrategyStatus();

            // wbtcAlloc + cbbtcAlloc should equal 10000 (100%)
            const totalAlloc = Number(status.wbtcAlloc) + Number(status.cbbtcAlloc);
            expect(totalAlloc).to.equal(10000, "Allocations must add up to 100%");

            console.log(`    WBTC Allocation: ${Number(status.wbtcAlloc) / 100}%`);
            console.log(`    cbBTC Allocation: ${Number(status.cbbtcAlloc) / 100}%`);
            console.log(`    Total: ${totalAlloc / 100}%`);
        });

        it("should report correct getAllocationDetails without double-counting", async function () {
            await strategy.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

            const details = await strategy.getAllocationDetails();

            // assetBalance should be 0 (not double-counted)
            expect(details.assetBalance).to.equal(0, "assetBalance should be 0 to avoid double-counting");

            // totalBalance should be wbtc + cbbtc only
            expect(details.totalBalance).to.equal(details.wbtcBalance + details.cbbtcBalance);

            // Percentages should add up to 100%
            const totalPercent = Number(details.wbtcPercent) + Number(details.cbbtcPercent);
            expect(totalPercent).to.equal(10000, "Percentages must add up to 100%");
        });
    });

    describe("Deposit and Withdrawal", function () {
        it("should accept deposits and mint shares", async function () {
            const sharesBefore = await strategy.balanceOf(user1.address);
            expect(sharesBefore).to.equal(0);

            await strategy.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

            const sharesAfter = await strategy.balanceOf(user1.address);
            expect(sharesAfter).to.be.gt(0);
            console.log(`    Shares minted: ${ethers.formatUnits(sharesAfter, 8)}`);
        });

        it("should allow withdrawals", async function () {
            await strategy.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);
            const shares = await strategy.balanceOf(user1.address);

            const balanceBefore = await cbBTC.balanceOf(user1.address);
            await strategy.connect(user1).redeem(shares / 2n, user1.address, user1.address);
            const balanceAfter = await cbBTC.balanceOf(user1.address);

            expect(balanceAfter).to.be.gt(balanceBefore);
            console.log(`    Withdrawn: ${ethers.formatUnits(balanceAfter - balanceBefore, 8)} cbBTC`);
        });
    });

    describe("Total Assets Calculation", function () {
        it("should report totalAssets correctly", async function () {
            await strategy.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);

            const totalAssets = await strategy.totalAssets();
            const cbbtcBalance = await cbBTC.balanceOf(await strategy.getAddress());
            const wbtcBalance = await wBTC.balanceOf(await strategy.getAddress());

            // totalAssets should approximate the sum of holdings
            // (may differ slightly due to fees or rounding)
            const expectedMin = (cbbtcBalance + wbtcBalance) * 95n / 100n; // Allow 5% variance
            expect(totalAssets).to.be.gte(expectedMin);
        });
    });

    describe("Edge Cases", function () {
        it("should handle zero balance scenario", async function () {
            // Before any deposits, allocations should be 0,0
            const status = await strategy.getStrategyStatus();

            // With only WBTC (from setup), should show 100% WBTC
            const wbtcBalance = await wBTC.balanceOf(await strategy.getAddress());
            if (wbtcBalance > 0n) {
                expect(status.wbtcAlloc).to.equal(10000); // 100%
                expect(status.cbbtcAlloc).to.equal(0);
            }
        });

        it("should handle multiple deposits from different users", async function () {
            await strategy.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address);
            await strategy.connect(user2).deposit(DEPOSIT_AMOUNT * 2n, user2.address);

            const user1Shares = await strategy.balanceOf(user1.address);
            const user2Shares = await strategy.balanceOf(user2.address);

            // User2 deposited 2x, should have roughly 2x shares
            expect(user2Shares).to.be.gt(user1Shares);
        });
    });
});
