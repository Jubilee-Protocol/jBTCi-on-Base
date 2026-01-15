const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const strategyAddress = "0x08F793B353e9C0EF52c9c00aa579c69F6D9DAA1A";

    // Strategy ABI for getStrategyStatus
    const abi = [
        "function getStrategyStatus() view returns (tuple(bool isPaused, uint256 totalHoldings, uint256 wbtcBalance, uint256 cbbtcBalance, uint256 wbtcAlloc, uint256 cbbtcAlloc))",
        "function totalAssets() view returns (uint256)"
    ];

    const strategy = new ethers.Contract(strategyAddress, abi, provider);

    console.log("🔍 Checking Testnet Strategy Allocation...\n");

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

        if (sum !== 10000) {
            console.log(`\n⚠️ WARNING: Allocations don't add up to 100%!`);
            console.log(`  This could be because:`);
            console.log(`  - Testnet strategy has a bug`);
            console.log(`  - No real WBTC on testnet (mock token not deposited)`);
            console.log(`  - Strategy only holds cbBTC`);
        }
    } catch (e) {
        console.log("getStrategyStatus failed:", e.message);

        // Try totalAssets
        try {
            const totalAssets = await strategy.totalAssets();
            console.log(`\nTotal Assets: ${ethers.formatUnits(totalAssets, 8)} BTC`);
        } catch (e2) {
            console.log("totalAssets also failed:", e2.message);
        }
    }
}

main().catch(console.error);
