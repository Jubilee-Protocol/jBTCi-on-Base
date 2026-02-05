const { ethers } = require("ethers");
require("dotenv").config();

// Mainnet strategy address from config.ts
const STRATEGY_ADDRESS = "0x8a4C0254258F0D3dB7Bc5C5A43825Bb4EfC81337";

// TokenizedStrategy ABI (minimal for checking)
const ABI = [
    "function isShutdown() view returns (bool)",
    "function management() view returns (address)",
    "function totalAssets() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function asset() view returns (address)",
    "function shutdownStrategy()",
];

async function main() {
    console.log("🔍 Checking Mainnet jBTCi Strategy Status...\n");
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");

    // Check if strategy has code
    const strategyCode = await provider.getCode(STRATEGY_ADDRESS);
    console.log(`Strategy Address: ${STRATEGY_ADDRESS}`);
    console.log(`Strategy Code Size: ${strategyCode.length}`);

    if (strategyCode === "0x") {
        console.error("❌ Strategy contract not deployed!");
        return;
    }

    console.log("✅ Strategy contract exists\n");

    const strategy = new ethers.Contract(STRATEGY_ADDRESS, ABI, provider);

    try {
        const isShutdown = await strategy.isShutdown();
        console.log(`Is Shutdown: ${isShutdown}`);

        const management = await strategy.management();
        console.log(`Management Address: ${management}`);

        const totalAssets = await strategy.totalAssets();
        console.log(`Total Assets: ${ethers.formatUnits(totalAssets, 8)} BTC`);

        const totalSupply = await strategy.totalSupply();
        console.log(`Total Supply: ${ethers.formatUnits(totalSupply, 8)} jBTCi`);

        const asset = await strategy.asset();
        console.log(`Underlying Asset: ${asset}`);

        if (totalAssets > 0n || totalSupply > 0n) {
            console.error("\n⚠️  WARNING: There are assets in the strategy!");
            console.error("⚠️  Users may have deposited funds!");
        } else {
            console.log("\n✅ No assets deposited yet - safe to redeploy");
        }
    } catch (e) {
        console.error("Error reading strategy:", e.message);
        console.log("\nThis might mean the delegatecall to TokenizedStrategy is failing.");
    }
}

main().catch(console.error);
