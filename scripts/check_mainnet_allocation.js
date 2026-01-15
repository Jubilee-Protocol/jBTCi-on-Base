const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const strategyAddress = "0x7d0Ae1Fa145F3d5B511262287fF686C25000816D";

    // Strategy ABI for getStrategyStatus
    const abi = [
        "function getStrategyStatus() view returns (tuple(bool isPaused, uint256 totalHoldings, uint256 wbtcBalance, uint256 cbbtcBalance, uint256 wbtcAlloc, uint256 cbbtcAlloc))",
        "function totalAssets() view returns (uint256)"
    ];

    const strategy = new ethers.Contract(strategyAddress, abi, provider);

    console.log("🔍 Checking MAINNET Strategy Allocation...\n");

    try {
        const status = await strategy.getStrategyStatus();
        console.log("Strategy Status:");
        console.log(`  isPaused: ${status.isPaused}`);
        console.log(`  totalHoldings: ${ethers.formatUnits(status.totalHoldings, 8)} BTC`);
        console.log(`  wbtcBalance: ${ethers.formatUnits(status.wbtcBalance, 8)} WBTC`);
        console.log(`  cbbtcBalance: ${ethers.formatUnits(status.cbbtcBalance, 8)} cbBTC`);
        console.log(`  wbtcAlloc: ${Number(status.wbtcAlloc) / 100}%`);
        console.log(`  cbbtcAlloc: ${Number(status.cbbtcAlloc) / 100}%`);

        const sum = Number(status.wbtcAlloc) + Number(status.cbbtcAlloc);
        console.log(`\n  Sum of allocations: ${sum / 100}%`);

        if (sum === 10000) {
            console.log(`\n✅ Mainnet allocations add up to 100% correctly!`);
        } else if (sum === 0) {
            console.log(`\n📍 No deposits yet - allocations are 0/0`);
        } else {
            console.log(`\n⚠️ Allocations don't add up to 100%`);
        }
    } catch (e) {
        console.log("getStrategyStatus failed:", e.message.slice(0, 100));

        // Try totalAssets
        try {
            const totalAssets = await strategy.totalAssets();
            console.log(`\nTotal Assets: ${ethers.formatUnits(totalAssets, 8)} BTC`);
        } catch (e2) {
            console.log("totalAssets also failed:", e2.message.slice(0, 100));
        }
    }
}

main().catch(console.error);
