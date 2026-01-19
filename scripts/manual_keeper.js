/**
 * Manual Keeper Script for jBTCi Strategy
 * 
 * Usage: node scripts/manual_keeper.js
 * 
 * This calls report() on the strategy to trigger rebalancing
 * if allocations have drifted beyond the threshold.
 */

const { ethers } = require("ethers");
require("dotenv").config();

const STRATEGY_ADDRESS = "0x27143095013184e718f92330C32A3D2eE9974053";

const ABI = [
    "function report() external returns (uint256 profit, uint256 loss)",
    "function getStrategyStatus() view returns (tuple(bool isPaused, bool isCBTriggered, bool isInOracleFailureMode, uint256 totalHoldings, uint256 dailySwapUsed, uint256 dailySwapLimit, uint256 lastGasCost, uint256 rebalancesExecuted, uint256 rebalancesFailed, uint256 swapsExecuted, uint256 swapsFailed, uint256 wbtcAlloc, uint256 cbbtcAlloc, uint256 failCount, uint256 timeUntilReset))",
    "function management() view returns (address)",
];

async function main() {
    console.log("🔧 jBTCi Manual Keeper\n");

    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        console.error("❌ PRIVATE_KEY not found in .env");
        process.exit(1);
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const strategy = new ethers.Contract(STRATEGY_ADDRESS, ABI, wallet);

    // Check if we're authorized
    const management = await strategy.management();
    console.log(`Management: ${management}`);
    console.log(`Your wallet: ${wallet.address}`);

    if (management.toLowerCase() !== wallet.address.toLowerCase()) {
        console.error("\n❌ Your wallet is not the management address!");
        console.error("Only management can call report()");
        process.exit(1);
    }

    // Get current status
    console.log("\n📊 Current Status:");
    const status = await strategy.getStrategyStatus();
    console.log(`  WBTC Allocation: ${Number(status.wbtcAlloc) / 100}%`);
    console.log(`  cbBTC Allocation: ${Number(status.cbbtcAlloc) / 100}%`);
    console.log(`  Total Holdings: ${ethers.formatUnits(status.totalHoldings, 8)} BTC`);
    console.log(`  Rebalances: ${status.rebalancesExecuted} executed, ${status.rebalancesFailed} failed`);
    console.log(`  Paused: ${status.isPaused}`);
    console.log(`  Circuit Breaker: ${status.isCBTriggered}`);

    // Ask for confirmation
    console.log("\n⚠️  About to call report() which may trigger rebalancing...");
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

    await new Promise((r) => setTimeout(r, 5000));

    // Call report
    console.log("📤 Calling report()...");
    const tx = await strategy.report();
    console.log(`TX Hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`\n✅ Report completed! Gas used: ${receipt.gasUsed.toString()}`);

    // Check if rebalance happened
    const rebalanceEvent = receipt.logs.find(
        (log) => log.topics[0] === ethers.id("Rebalanced(address,address,uint256,uint256,uint256,uint256)")
    );

    if (rebalanceEvent) {
        console.log("🔄 Rebalance was executed!");
    } else {
        console.log("ℹ️  No rebalance needed (allocation within threshold)");
    }
}

main().catch(console.error);
