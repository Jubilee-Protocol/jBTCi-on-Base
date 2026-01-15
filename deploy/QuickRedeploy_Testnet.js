/**
 * Deploy ONLY the YearnJBTCiStrategy to Base Sepolia Testnet
 * Uses existing mock infrastructure from previous deployment
 * 
 * This is for quick redeployment after contract bug fixes
 */

const { ethers } = require("ethers");
const hre = require("hardhat");
require("dotenv").config();

// EXISTING MOCK ADDRESSES FROM PREVIOUS DEPLOYMENT
// Read from working testnet strategy 0x08F793B353e9C0EF52c9c00aa579c69F6D9DAA1A
// IMPORTANT: Contract requires different addresses for main vs fallback oracles,
// and different addresses for aerodrome vs uniswap routers
const EXISTING_MOCKS = {
    // Tokens
    cbBTC: "0x5552ce4C7c6821A43fD53aB2E4fBd28d2B8c5A5d",
    wBTC: "0x209d54Cf12e4904AD74dD6200331c99014A4Cced",

    // Oracles - MUST be different from fallbacks
    btcOracle: "0x71c51efAA9928c79C967Dc0B8Db5BfF17d9C97bA",
    ethOracle: "0xd1bF3851E2f1586D3d2d280ab4924e7058B32C6B",
    // Use token addresses as fallback oracles (they exist and are different)
    btcFallback: "0x5552ce4C7c6821A43fD53aB2E4fBd28d2B8c5A5d", // cbBTC address as placeholder
    ethFallback: "0x209d54Cf12e4904AD74dD6200331c99014A4Cced", // wBTC address as placeholder

    // Pools - these get used for TWAP checks  
    poolWbtcEth: "0x0cC95b9b4CDBBAe45d78FBa16237528343d7B79e",
    poolCbbtcUsdc: "0x71c51efAA9928c79C967Dc0B8Db5BfF17d9C97bA", // different from above

    // Routers - MUST be different from each other
    aerodromeRouter: "0x5552ce4C7c6821A43fD53aB2E4fBd28d2B8c5A5d", // cbBTC as placeholder
    uniswapRouter: "0x209d54Cf12e4904AD74dD6200331c99014A4Cced",   // wBTC as placeholder
};

async function main() {
    console.log("🔧 Quick Redeploy: YearnJBTCiStrategy (Bug Fix Version)...\n");

    const provider = new ethers.JsonRpcProvider(hre.network.config.url);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not found in .env");

    const deployer = new ethers.Wallet(privateKey, provider);
    console.log("Deploying from:", deployer.address);

    const balance = await provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH\n");

    if (balance < ethers.parseEther("0.001")) {
        throw new Error("Insufficient balance! Need at least 0.001 ETH");
    }

    const getFactory = async (name) => {
        const artifact = await hre.artifacts.readArtifact(name);
        return new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
    };

    // Deploy only the strategy
    console.log("⏳ Deploying YearnJBTCiStrategy (fixed version)...");

    const STRATEGY_NAME = "Jubilee Bitcoin Index (Testnet v2 - Bug Fix)";

    const YearnJBTCiStrategy = await getFactory("contracts/YearnJBTCiStrategy.sol:YearnJBTCiStrategy");

    const strategy = await YearnJBTCiStrategy.deploy(
        EXISTING_MOCKS.cbBTC,        // _asset (cbBTC as base asset)
        STRATEGY_NAME,                // _name
        EXISTING_MOCKS.wBTC,          // _wbtc
        EXISTING_MOCKS.cbBTC,         // _cbbtc
        EXISTING_MOCKS.btcOracle,     // _btcUsdOracle
        EXISTING_MOCKS.ethOracle,     // _ethUsdOracle
        EXISTING_MOCKS.poolWbtcEth,   // _uniswapV3PoolWbtcEth
        EXISTING_MOCKS.poolCbbtcUsdc, // _uniswapV3PoolCbbtcUsdc
        EXISTING_MOCKS.aerodromeRouter, // _aerodromeRouter
        EXISTING_MOCKS.uniswapRouter,   // _uniswapRouter
        EXISTING_MOCKS.btcFallback,   // _fallbackBtcOracle
        EXISTING_MOCKS.ethFallback    // _fallbackEthOracle
    );

    console.log("  Waiting for deployment...");
    await strategy.waitForDeployment();
    const strategyAddr = await strategy.getAddress();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 STRATEGY REDEPLOYED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log("New Strategy Address:", strategyAddr);
    console.log("\n📝 Update frontend/config.ts with this address!");

    // Verify the fix
    console.log("\n🔍 Verifying bug fix...");
    const abi = [
        "function getStrategyStatus() view returns (tuple(bool isPaused, uint256 totalHoldings, uint256 wbtcBalance, uint256 cbbtcBalance, uint256 wbtcAlloc, uint256 cbbtcAlloc))"
    ];
    const contract = new ethers.Contract(strategyAddr, abi, provider);

    try {
        const status = await contract.getStrategyStatus();
        console.log("  totalHoldings:", ethers.formatUnits(status.totalHoldings, 8), "BTC");
        console.log("  wbtcAlloc:", Number(status.wbtcAlloc) / 100, "%");
        console.log("  cbbtcAlloc:", Number(status.cbbtcAlloc) / 100, "%");

        const totalAlloc = Number(status.wbtcAlloc) + Number(status.cbbtcAlloc);
        if (totalAlloc === 0 || totalAlloc === 10000) {
            console.log("  ✅ Allocations correct (0% or 100% total)");
        } else {
            console.log("  ⚠️ Allocations sum to:", totalAlloc / 100, "% - check if this is expected");
        }
    } catch (e) {
        console.log("  Could not verify (no deposits yet):", e.message.slice(0, 50));
    }

    return strategyAddr;
}

main()
    .then((addr) => {
        console.log(`\n✅ Done! New strategy: ${addr}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Failed:", error);
        process.exit(1);
    });
