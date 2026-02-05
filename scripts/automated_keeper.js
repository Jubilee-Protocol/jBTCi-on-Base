/**
 * Automated Keeper - Runs 5x Daily at Global Market Opens
 * 
 * Schedule (all times UTC):
 * - 21:00 UTC = Sydney 8am AEDT
 * - 23:00 UTC = Tokyo/Shanghai 8am 
 * - 04:00 UTC = Dubai 8am GST
 * - 08:00 UTC = London 8am GMT
 * - 13:00 UTC = New York 8am EST
 * 
 * Usage: 
 *   node scripts/automated_keeper.js          # Run in foreground
 *   nohup node scripts/automated_keeper.js &  # Run in background
 *   pm2 start scripts/automated_keeper.js     # Run with pm2
 */

const { ethers } = require("ethers");
require("dotenv").config();

const STRATEGY_ADDRESS = "0x8a4C0254258F0D3dB7Bc5C5A43825Bb4EfC81337";

// Schedule in UTC hours (24hr format)
const SCHEDULE_UTC = [
    { hour: 21, name: "Sydney" },
    { hour: 23, name: "Tokyo/Shanghai" },
    { hour: 4, name: "Dubai" },
    { hour: 8, name: "London" },
    { hour: 13, name: "New York" },
];

const ABI = [
    "function report() external returns (uint256 profit, uint256 loss)",
    "function getStrategyStatus() view returns (tuple(bool isPaused, bool isCBTriggered, bool isInOracleFailureMode, uint256 totalHoldings, uint256 dailySwapUsed, uint256 dailySwapLimit, uint256 lastGasCost, uint256 rebalancesExecuted, uint256 rebalancesFailed, uint256 swapsExecuted, uint256 swapsFailed, uint256 wbtcAlloc, uint256 cbbtcAlloc, uint256 failCount, uint256 timeUntilReset))",
    "function totalAssets() view returns (uint256)",
];

let lastRunHour = -1;

async function callReport() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        console.error("❌ PRIVATE_KEY not found");
        return;
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const strategy = new ethers.Contract(STRATEGY_ADDRESS, ABI, wallet);

    try {
        // Check if there are any assets to manage
        const totalAssets = await strategy.totalAssets();
        if (totalAssets === 0n) {
            console.log("ℹ️  No assets in strategy, skipping report");
            return;
        }

        // Get status before
        const status = await strategy.getStrategyStatus();
        console.log(`📊 Holdings: ${ethers.formatUnits(totalAssets, 8)} BTC`);
        console.log(`   WBTC: ${Number(status.wbtcAlloc) / 100}% | cbBTC: ${Number(status.cbbtcAlloc) / 100}%`);

        // Skip if paused or circuit breaker active
        if (status.isPaused) {
            console.log("⏸️  Strategy paused, skipping");
            return;
        }
        if (status.isCBTriggered) {
            console.log("🛑 Circuit breaker active, skipping");
            return;
        }

        // Call report
        console.log("📤 Calling report()...");
        const tx = await strategy.report();
        console.log(`   TX: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`✅ Complete! Gas: ${receipt.gasUsed.toString()}`);

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

function getNextRun() {
    const now = new Date();
    const currentHourUTC = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Find next scheduled time
    let nextRun = null;
    let minWait = Infinity;

    for (const slot of SCHEDULE_UTC) {
        let hoursUntil = slot.hour - currentHourUTC;
        if (hoursUntil < 0 || (hoursUntil === 0 && currentMinute > 5)) {
            hoursUntil += 24; // Next day
        }

        const msUntil = (hoursUntil * 60 - currentMinute) * 60 * 1000;

        if (msUntil > 0 && msUntil < minWait) {
            minWait = msUntil;
            nextRun = slot;
        }
    }

    return { slot: nextRun, waitMs: minWait };
}

async function main() {
    console.log("🤖 jBTCi Automated Keeper Started");
    console.log("================================");
    console.log("Schedule (UTC):");
    SCHEDULE_UTC.forEach(s => console.log(`  ${s.hour.toString().padStart(2, '0')}:00 - ${s.name}`));
    console.log("");

    // Main loop
    while (true) {
        const { slot, waitMs } = getNextRun();
        const waitHours = (waitMs / 1000 / 60 / 60).toFixed(2);

        console.log(`⏰ Next: ${slot.name} in ${waitHours} hours`);

        // Wait until next slot
        await new Promise(r => setTimeout(r, waitMs));

        // Run keeper
        console.log(`\n🌍 [${new Date().toISOString()}] ${slot.name} Market Open`);
        await callReport();
        console.log("");

        // Small delay to prevent double-trigger
        await new Promise(r => setTimeout(r, 60000));
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log("\n👋 Keeper stopped");
    process.exit(0);
});

main().catch(console.error);
