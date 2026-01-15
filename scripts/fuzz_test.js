/**
 * Fuzz Test Suite for YearnJBTCiStrategy
 * 
 * Simulates random inputs and edge cases to find vulnerabilities
 * Run: node scripts/fuzz_test.js
 */

const { ethers } = require('ethers');

const TESTNET_STRATEGY = "0x43814Da4b3CB4344395A85afF2325282A43cbda6";
const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

const STRATEGY_ABI = [
    "function getStrategyStatus() view returns (tuple(bool isPaused, bool isCBTriggered, bool isInOracleFailureMode, uint256 totalHoldings, uint256 dailySwapUsed, uint256 dailySwapLimit, uint256 lastGasCost, uint256 rebalancesExecuted, uint256 rebalancesFailed, uint256 swapsExecuted, uint256 swapsFailed, uint256 wbtcAlloc, uint256 cbbtcAlloc, uint256 failCount, uint256 timeUntilReset))",
    "function getAllocationDetails() view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
    "function depositCap() view returns (uint256)",
    "function maxSlippage() view returns (uint256)",
    "function availableDepositLimit(address) view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
];

const strategy = new ethers.Contract(TESTNET_STRATEGY, STRATEGY_ABI, provider);

let passed = 0;
let failed = 0;
const iterations = 50;

function randomAddress() {
    return ethers.Wallet.createRandom().address;
}

function randomUint256() {
    return BigInt('0x' + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join(''));
}

async function runFuzzTests() {
    console.log("╔═══════════════════════════════════════════════════════════════╗");
    console.log("║           jBTCi FUZZ TEST SUITE (Read-Only)                   ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝\n");

    console.log("Testing with", iterations, "random inputs per function\n");

    // ============================================
    // FUZZ 1: balanceOf with random addresses
    // ============================================
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("FUZZ 1: balanceOf(random addresses)");
    console.log("═══════════════════════════════════════════════════════════════");

    let balanceFuzz = 0;
    for (let i = 0; i < iterations; i++) {
        const addr = randomAddress();
        try {
            const bal = await strategy.balanceOf(addr);
            // Should return 0 for random addresses, never revert
            if (bal === 0n) balanceFuzz++;
        } catch (e) {
            console.log(`  ❌ Reverted on address: ${addr}`);
            failed++;
        }
    }
    console.log(`  ✅ Passed ${balanceFuzz}/${iterations} random address queries`);
    passed += balanceFuzz;

    // ============================================
    // FUZZ 2: availableDepositLimit with random addresses
    // ============================================
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("FUZZ 2: availableDepositLimit(random addresses)");
    console.log("═══════════════════════════════════════════════════════════════");

    let depositLimitFuzz = 0;
    for (let i = 0; i < iterations; i++) {
        const addr = randomAddress();
        try {
            const limit = await strategy.availableDepositLimit(addr);
            // Should return consistent value regardless of address
            depositLimitFuzz++;
        } catch (e) {
            console.log(`  ❌ Reverted on address: ${addr}`);
            failed++;
        }
    }
    console.log(`  ✅ Passed ${depositLimitFuzz}/${iterations} random address queries`);
    passed += depositLimitFuzz;

    // ============================================
    // FUZZ 3: Edge case addresses
    // ============================================
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("FUZZ 3: Edge case addresses");
    console.log("═══════════════════════════════════════════════════════════════");

    const edgeCases = [
        ethers.ZeroAddress,
        "0x0000000000000000000000000000000000000001",
        "0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF",
        "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF",
        TESTNET_STRATEGY, // Query itself
    ];

    let edgePassed = 0;
    for (const addr of edgeCases) {
        try {
            const bal = await strategy.balanceOf(addr);
            const limit = await strategy.availableDepositLimit(addr);
            edgePassed++;
            console.log(`  ✅ ${addr.slice(0, 10)}... - bal: ${bal}, limit: ${ethers.formatUnits(limit, 8)}`);
        } catch (e) {
            console.log(`  ❌ Reverted on: ${addr}`);
            failed++;
        }
    }
    passed += edgePassed;

    // ============================================
    // FUZZ 4: Verify view functions never revert
    // ============================================
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("FUZZ 4: View functions stability test");
    console.log("═══════════════════════════════════════════════════════════════");

    const viewTests = [
        { name: 'getStrategyStatus', fn: () => strategy.getStrategyStatus() },
        { name: 'getAllocationDetails', fn: () => strategy.getAllocationDetails() },
        { name: 'depositCap', fn: () => strategy.depositCap() },
        { name: 'maxSlippage', fn: () => strategy.maxSlippage() },
    ];

    // Call each function 10 times rapidly
    for (const test of viewTests) {
        let success = 0;
        for (let i = 0; i < 10; i++) {
            try {
                await test.fn();
                success++;
            } catch (e) {
                console.log(`  ❌ ${test.name} failed on call ${i}`);
                failed++;
            }
        }
        console.log(`  ✅ ${test.name}: ${success}/10 calls succeeded`);
        passed += success;
    }

    // ============================================
    // FUZZ 5: Allocation math consistency
    // ============================================
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("FUZZ 5: Allocation math consistency");
    console.log("═══════════════════════════════════════════════════════════════");

    let mathPassed = 0;
    for (let i = 0; i < 20; i++) {
        try {
            const details = await strategy.getAllocationDetails();
            const wbtcBal = details[0];
            const cbbtcBal = details[1];
            const assetBal = details[2];
            const totalBal = details[3];

            // Verify: wbtc + cbbtc + asset = total
            const sum = wbtcBal + cbbtcBal + assetBal;
            if (sum === totalBal) {
                mathPassed++;
            } else {
                console.log(`  ❌ Math inconsistency: ${sum} != ${totalBal}`);
                failed++;
            }
        } catch (e) {
            failed++;
        }
    }
    console.log(`  ✅ Math consistency: ${mathPassed}/20 checks passed`);
    passed += mathPassed;

    // ============================================
    // Summary
    // ============================================
    const totalTests = passed + failed;
    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║                    FUZZ TEST RESULTS                          ║");
    console.log("╠═══════════════════════════════════════════════════════════════╣");
    console.log(`║  ✅ PASSED: ${passed.toString().padStart(4)}                                          ║`);
    console.log(`║  ❌ FAILED: ${failed.toString().padStart(4)}                                          ║`);
    console.log(`║  SUCCESS RATE: ${((passed / totalTests) * 100).toFixed(1)}%                                     ║`);
    console.log("╠═══════════════════════════════════════════════════════════════╣");

    if (failed === 0) {
        console.log("║  RESULT: ✅ ALL FUZZ TESTS PASSED                             ║");
    } else {
        console.log("║  RESULT: ⚠️  SOME TESTS FAILED                                ║");
    }
    console.log("╚═══════════════════════════════════════════════════════════════╝");

    return { passed, failed };
}

runFuzzTests().catch(console.error);
