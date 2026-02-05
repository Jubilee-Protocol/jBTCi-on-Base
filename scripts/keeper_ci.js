/**
 * jBTCi Keeper - GitHub Actions Compatible
 * 
 * This script is designed to run in CI/GitHub Actions.
 * It checks if rebalancing is needed and calls report() once, then exits.
 * 
 * Environment variables required:
 *   - PRIVATE_KEY: Wallet private key with keeper permissions
 *   - BASE_RPC_URL: Optional, defaults to public RPC
 */

const { ethers } = require("ethers");

const STRATEGY_ADDRESS = "0x8a4C0254258F0D3dB7Bc5C5A43825Bb4EfC81337";
const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";

const ABI = [
    "function report() external returns (uint256 profit, uint256 loss)",
    "function tend() external",
    "function getStrategyStatus() view returns (tuple(bool isPaused, bool isCBTriggered, bool isInOracleFailureMode, uint256 totalHoldings, uint256 dailySwapUsed, uint256 dailySwapLimit, uint256 lastGasCost, uint256 rebalancesExecuted, uint256 rebalancesFailed, uint256 swapsExecuted, uint256 swapsFailed, uint256 wbtcAlloc, uint256 cbbtcAlloc, uint256 failCount, uint256 timeUntilReset))",
    "function totalAssets() view returns (uint256)",
    "function lastRebalanceTime() view returns (uint256)",
    "function minRebalanceInterval() view returns (uint256)",
    "function rebalanceThreshold() view returns (uint256)",
];

async function main() {
    console.log("🤖 jBTCi Keeper - GitHub Actions");
    console.log("================================");
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Contract: ${STRATEGY_ADDRESS}`);
    console.log("");

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error("❌ PRIVATE_KEY environment variable not set");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const strategy = new ethers.Contract(STRATEGY_ADDRESS, ABI, wallet);

    console.log(`Keeper wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet ETH: ${ethers.formatEther(balance)}`);

    if (balance < ethers.parseEther("0.0001")) {
        console.warn("⚠️  Low ETH balance - may fail to submit transactions");
    }

    // Get strategy status
    const totalAssets = await strategy.totalAssets();
    console.log(`\n📊 Strategy Status:`);
    console.log(`   Total assets: ${ethers.formatUnits(totalAssets, 8)} BTC`);

    if (totalAssets === 0n) {
        console.log("ℹ️  No assets in strategy - nothing to rebalance");
        console.log("✅ Keeper check complete (no action needed)");
        return;
    }

    const status = await strategy.getStrategyStatus();
    console.log(`   WBTC: ${Number(status.wbtcAlloc) / 100}%`);
    console.log(`   cbBTC: ${Number(status.cbbtcAlloc) / 100}%`);
    console.log(`   Paused: ${status.isPaused}`);
    console.log(`   Circuit breaker: ${status.isCBTriggered}`);
    console.log(`   Oracle failure: ${status.isInOracleFailureMode}`);

    // Skip if strategy is in a blocked state
    if (status.isPaused) {
        console.log("\n⏸️  Strategy is paused - skipping");
        return;
    }
    if (status.isCBTriggered) {
        console.log("\n🛑 Circuit breaker active - skipping");
        return;
    }

    // Check if rebalance interval has passed
    const lastRebalance = await strategy.lastRebalanceTime();
    const minInterval = await strategy.minRebalanceInterval();
    const now = BigInt(Math.floor(Date.now() / 1000));

    if (lastRebalance > 0n && now < lastRebalance + minInterval) {
        const nextRebalance = Number(lastRebalance + minInterval - now);
        console.log(`\n⏰ Min interval not passed - ${Math.round(nextRebalance / 60)} minutes until next allowed`);
        return;
    }

    // Check allocation drift
    const wbtcPct = Number(status.wbtcAlloc);
    const cbbtcPct = Number(status.cbbtcAlloc);
    const drift = Math.abs(wbtcPct - cbbtcPct);
    const threshold = await strategy.rebalanceThreshold();

    console.log(`\n📈 Allocation drift: ${drift / 100}% (threshold: ${Number(threshold) / 100}%)`);

    if (drift < Number(threshold)) {
        console.log("✅ Within threshold - no rebalance needed");
        return;
    }

    // Execute rebalance via tend()
    console.log("\n🔄 Calling tend() for rebalancing...");
    try {
        const tx = await strategy.tend();
        console.log(`   TX: ${tx.hash}`);
        console.log("   Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`✅ Rebalance complete!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Block: ${receipt.blockNumber}`);
    } catch (error) {
        console.error(`❌ Rebalance failed: ${error.message}`);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
