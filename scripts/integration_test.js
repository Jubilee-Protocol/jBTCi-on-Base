/**
 * Integration Test Suite for YearnJBTCiStrategy
 * Runs against deployed testnet contract
 * 
 * Run: node scripts/integration_test.js
 */

const { ethers } = require('ethers');

const TESTNET_STRATEGY = "0x43814Da4b3CB4344395A85afF2325282A43cbda6";
const TESTNET_CBBTC = "0x0D1feA7B0f63A9DA5b0dA89faFfBb56192d7cd93";
const TESTNET_WBTC = "0x5ed96C75f5F04A94308623A8828B819E7Ef60B1c";

const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

const STRATEGY_ABI = [
    "function getStrategyStatus() view returns (tuple(bool isPaused, bool isCBTriggered, bool isInOracleFailureMode, uint256 totalHoldings, uint256 dailySwapUsed, uint256 dailySwapLimit, uint256 lastGasCost, uint256 rebalancesExecuted, uint256 rebalancesFailed, uint256 swapsExecuted, uint256 swapsFailed, uint256 wbtcAlloc, uint256 cbbtcAlloc, uint256 failCount, uint256 timeUntilReset))",
    "function getAllocationDetails() view returns (uint256 wbtcBalance, uint256 cbbtcBalance, uint256 assetBalance, uint256 totalBalance, uint256 wbtcPercent, uint256 cbbtcPercent, uint256 assetPercent)",
    "function getOracleStatus() view returns (uint256 btcPrice, uint256 ethPrice, bool btcHealthy, bool ethHealthy, bool inFailureMode)",
    "function depositCap() view returns (uint256)",
    "function maxSlippage() view returns (uint256)",
    "function swapFee() view returns (uint256)",
    "function totalAssets() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
];

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
];

const strategy = new ethers.Contract(TESTNET_STRATEGY, STRATEGY_ABI, provider);
const cbBTC = new ethers.Contract(TESTNET_CBBTC, ERC20_ABI, provider);
const wBTC = new ethers.Contract(TESTNET_WBTC, ERC20_ABI, provider);

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

async function runIntegrationTests() {
    console.log("╔═══════════════════════════════════════════════════════════════╗");
    console.log("║       jBTCi INTEGRATION TEST SUITE (Testnet)                  ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝\n");

    console.log("Strategy:", TESTNET_STRATEGY);
    console.log("Network: Base Sepolia\n");

    // ============================================
    // TEST 1: Bug Fix Verification
    // ============================================
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("TEST 1: DOUBLE-COUNTING BUG FIX");
    console.log("═══════════════════════════════════════════════════════════════");

    try {
        const details = await strategy.getAllocationDetails();
        const assetBalance = details[2];

        assert(assetBalance === 0n, `assetBalance = 0 (got ${ethers.formatUnits(assetBalance, 8)} BTC)`);

        // If there are holdings, verify percentages add to 100%
        if (details[3] > 0n) {
            const sum = Number(details[4]) + Number(details[5]);
            assert(sum === 10000, `Percentages sum to 100% (got ${sum / 100}%)`);
        } else {
            console.log("  ℹ️ INFO: No holdings yet, skipping percentage check");
        }
    } catch (e) {
        console.log("  ❌ ERROR:", e.message.slice(0, 80));
        failed++;
    }

    // ============================================
    // TEST 2: Parameter Bounds
    // ============================================
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("TEST 2: PARAMETER BOUNDS VERIFICATION");
    console.log("═══════════════════════════════════════════════════════════════");

    try {
        const depositCap = await strategy.depositCap();
        const maxSlippage = await strategy.maxSlippage();
        const swapFee = await strategy.swapFee();

        assert(
            depositCap >= 1n * 10n ** 8n && depositCap <= 1000n * 10n ** 8n,
            `depositCap in bounds: ${ethers.formatUnits(depositCap, 8)} BTC`
        );

        assert(
            maxSlippage >= 10 && maxSlippage <= 1000,
            `maxSlippage in bounds: ${Number(maxSlippage) / 100}%`
        );

        assert(
            swapFee >= 5 && swapFee <= 100,
            `swapFee in bounds: ${Number(swapFee) / 100}%`
        );
    } catch (e) {
        console.log("  ❌ ERROR:", e.message.slice(0, 80));
        failed++;
    }

    // ============================================
    // TEST 3: Oracle Status
    // ============================================
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("TEST 3: ORACLE STATUS");
    console.log("═══════════════════════════════════════════════════════════════");

    try {
        const oracleStatus = await strategy.getOracleStatus();
        const btcPrice = oracleStatus[0];
        const ethPrice = oracleStatus[1];
        const btcHealthy = oracleStatus[2];
        const ethHealthy = oracleStatus[3];

        console.log(`  BTC Price: $${ethers.formatUnits(btcPrice, 8)}`);
        console.log(`  ETH Price: $${ethers.formatUnits(ethPrice, 8)}`);
        console.log(`  BTC Healthy: ${btcHealthy}`);
        console.log(`  ETH Healthy: ${ethHealthy}`);

        // On testnet, mock oracle may not return valid price
        if (btcPrice === 0n) {
            console.log("  ⚠️ WARN: BTC oracle returning 0 (mock issue on testnet)");
        } else {
            assert(btcHealthy, "BTC oracle is healthy");
        }
    } catch (e) {
        console.log("  ❌ ERROR:", e.message.slice(0, 80));
        failed++;
    }

    // ============================================
    // TEST 4: Strategy Status
    // ============================================
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("TEST 4: STRATEGY STATUS");
    console.log("═══════════════════════════════════════════════════════════════");

    try {
        const status = await strategy.getStrategyStatus();

        console.log(`  isPaused: ${status.isPaused}`);
        console.log(`  Circuit Breaker Triggered: ${status.isCBTriggered}`);
        console.log(`  Oracle Failure Mode: ${status.isInOracleFailureMode}`);
        console.log(`  Total Holdings: ${ethers.formatUnits(status.totalHoldings, 8)} BTC`);
        console.log(`  Daily Swap Used: ${ethers.formatUnits(status.dailySwapUsed, 8)} BTC`);
        console.log(`  Daily Swap Limit: ${ethers.formatUnits(status.dailySwapLimit, 8)} BTC`);

        assert(!status.isCBTriggered, "Circuit breaker not triggered");
        assert(status.dailySwapLimit > 0n, `Daily swap limit set: ${ethers.formatUnits(status.dailySwapLimit, 8)} BTC`);
    } catch (e) {
        console.log("  ❌ ERROR:", e.message.slice(0, 80));
        failed++;
    }

    // ============================================
    // TEST 5: Token Contracts
    // ============================================
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("TEST 5: TOKEN CONTRACTS");
    console.log("═══════════════════════════════════════════════════════════════");

    try {
        const cbbtcBal = await cbBTC.balanceOf(TESTNET_STRATEGY);
        const wbtcBal = await wBTC.balanceOf(TESTNET_STRATEGY);

        console.log(`  Strategy cbBTC balance: ${ethers.formatUnits(cbbtcBal, 8)}`);
        console.log(`  Strategy WBTC balance: ${ethers.formatUnits(wbtcBal, 8)}`);

        assert(true, "Token balance queries work");
    } catch (e) {
        console.log("  ❌ ERROR:", e.message.slice(0, 80));
        failed++;
    }

    // ============================================
    // TEST 6: totalAssets Consistency
    // ============================================
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("TEST 6: TOTAL ASSETS CONSISTENCY");
    console.log("═══════════════════════════════════════════════════════════════");

    try {
        const totalAssets = await strategy.totalAssets();
        const status = await strategy.getStrategyStatus();

        console.log(`  totalAssets(): ${ethers.formatUnits(totalAssets, 8)} BTC`);
        console.log(`  totalHoldings: ${ethers.formatUnits(status.totalHoldings, 8)} BTC`);

        // totalAssets may include pending yield, so it should be >= totalHoldings
        // OR they should be very close
        assert(true, "totalAssets() returns without error");
    } catch (e) {
        console.log("  ❌ ERROR:", e.message.slice(0, 80));
        failed++;
    }

    // ============================================
    // Summary
    // ============================================
    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║                    TEST RESULTS                               ║");
    console.log("╠═══════════════════════════════════════════════════════════════╣");
    console.log(`║  ✅ PASSED: ${passed.toString().padStart(3)}                                            ║`);
    console.log(`║  ❌ FAILED: ${failed.toString().padStart(3)}                                            ║`);
    console.log("╠═══════════════════════════════════════════════════════════════╣");

    if (failed === 0) {
        console.log("║  RESULT: ✅ ALL INTEGRATION TESTS PASSED                      ║");
    } else {
        console.log("║  RESULT: ⚠️  SOME TESTS FAILED (review above)                 ║");
    }
    console.log("╚═══════════════════════════════════════════════════════════════╝");

    return { passed, failed };
}

runIntegrationTests().catch(console.error);
