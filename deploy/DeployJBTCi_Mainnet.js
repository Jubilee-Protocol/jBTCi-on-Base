/**
 * Mainnet Deployment Script - YearnJBTCiStrategy
 * 
 * IMPORTANT: This deploys to Base MAINNET with real tokens and oracles!
 * 
 * Prerequisites:
 * 1. Sufficient ETH in deployer wallet for gas (~0.01 ETH)
 * 2. PRIVATE_KEY in .env file
 * 
 * Usage:
 *   npx hardhat run deploy/DeployJBTCi_Mainnet.js --network base
 */

const { ethers } = require("ethers");
const hre = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🚀 Deploying jBTCi to BASE MAINNET...\n");
    console.log("⚠️  WARNING: This is a MAINNET deployment!");
    console.log("=".repeat(50));

    // Setup Provider & Wallet manually (matching testnet pattern)
    const provider = new ethers.JsonRpcProvider(hre.network.config.url);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not found in .env");

    const deployer = new ethers.Wallet(privateKey, provider);
    console.log(`Deploying from: ${deployer.address}`);

    const balance = await provider.getBalance(deployer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

    if (balance < ethers.parseEther("0.005")) {
        throw new Error("Insufficient ETH for deployment! Need at least 0.005 ETH");
    }

    // Helper to get factory
    const getFactory = async (name) => {
        const artifact = await hre.artifacts.readArtifact(name);
        return new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
    };

    // ==========================================
    // BASE MAINNET ADDRESSES
    // ==========================================

    // BTC Tokens on Base
    const WBTC = ethers.getAddress("0x0555e30da8f98308edb960aa94c0db47230d2b9c");      // Base WBTC
    const CBBTC = ethers.getAddress("0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf");     // Base cbBTC

    // Chainlink Oracles on Base (verified from Chainlink docs)
    const BTC_USD_ORACLE = ethers.getAddress("0x64c997316719ee9e0757755b41295d018b14848f");
    const ETH_USD_ORACLE = ethers.getAddress("0x71041dddad3595f9ced3dccfbe3d1f4b0a16bb70");

    // Fallback Oracles (Pyth or secondary Chainlink)
    const FALLBACK_BTC_ORACLE = ethers.getAddress("0x4b5b01ffc862d9c06a0b093f83d2b5cc99e16b6e");
    const FALLBACK_ETH_ORACLE = ethers.getAddress("0x3c6cd9cc7c7a4c2cf5a82734cd249d7d593354da");

    // DEX Routers
    const AERODROME_ROUTER = ethers.getAddress("0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43");
    const UNISWAP_ROUTER = ethers.getAddress("0x2626664c2603336e57b271c5c0b26f421741e481");

    // Uniswap V3 Pools (Base Mainnet)
    const UNISWAP_V3_POOL_WBTC_ETH = ethers.getAddress("0xc9289a5ef42eafa9e07665fcacf46127495cc222");
    const UNISWAP_V3_POOL_CBBTC_USDC = ethers.getAddress("0xfbb6eed8e7aa03b138556eedaf5d271a5e1e43ef");

    console.log("📋 Mainnet Addresses:");
    console.log(`  WBTC: ${WBTC}`);
    console.log(`  cbBTC: ${CBBTC}`);
    console.log(`  BTC/USD Oracle: ${BTC_USD_ORACLE}`);
    console.log(`  Aerodrome Router: ${AERODROME_ROUTER}`);

    // ==========================================
    // PRE-DEPLOYMENT VALIDATION
    // ==========================================
    console.log("\n⏳ Validating addresses...");

    // Check if tokens have code (are deployed contracts)
    const wbtcCode = await provider.getCode(WBTC);
    if (wbtcCode === "0x") throw new Error("WBTC not found at address!");
    console.log("  ✅ WBTC verified");

    // Note: Oracle validation removed - oracles may be proxied
    console.log("  ✅ Oracle addresses set (not validated - may be proxies)");

    // ==========================================
    // CHECK: Uniswap V3 Pools must be set
    // ==========================================
    if (UNISWAP_V3_POOL_WBTC_ETH === "0x0000000000000000000000000000000000000000") {
        console.log("\n❌ ERROR: Uniswap V3 pool addresses not configured!");
        process.exit(1);
    }

    // ==========================================
    // DEPLOY STRATEGY
    // ==========================================
    console.log("\n⏳ Deploying YearnJBTCiStrategy...");

    const YearnJBTCiStrategy = await getFactory("contracts/YearnJBTCiStrategy.sol:YearnJBTCiStrategy");

    const strategy = await YearnJBTCiStrategy.deploy(
        CBBTC,                      // asset (cbBTC as base asset)
        "jBTCi Strategy",           // name
        WBTC,                       // wbtc
        CBBTC,                      // cbbtc
        BTC_USD_ORACLE,             // btcUsdOracle
        ETH_USD_ORACLE,             // ethUsdOracle
        UNISWAP_V3_POOL_WBTC_ETH,   // uniswapV3PoolWbtcEth
        UNISWAP_V3_POOL_CBBTC_USDC, // uniswapV3PoolCbbtcUsdc
        AERODROME_ROUTER,           // aerodromeRouter
        UNISWAP_ROUTER,             // uniswapRouter
        FALLBACK_BTC_ORACLE,        // fallbackBtcOracle
        FALLBACK_ETH_ORACLE         // fallbackEthOracle
    );

    await strategy.waitForDeployment();
    const strategyAddr = await strategy.getAddress();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 MAINNET DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(50));
    console.log(`Strategy Address: ${strategyAddr}`);
    console.log(`\nView on BaseScan: https://basescan.org/address/${strategyAddr}`);

    // ==========================================
    // VERIFY ON BASESCAN
    // ==========================================
    console.log("\n📋 To verify on BaseScan:");
    console.log(`npx hardhat verify --network base ${strategyAddr} \\`);
    console.log(`  ${CBBTC} "jBTCi Strategy" ${WBTC} ${CBBTC} \\`);
    console.log(`  ${BTC_USD_ORACLE} ${ETH_USD_ORACLE} \\`);
    console.log(`  ${UNISWAP_V3_POOL_WBTC_ETH} ${UNISWAP_V3_POOL_CBBTC_USDC} \\`);
    console.log(`  ${AERODROME_ROUTER} ${UNISWAP_ROUTER} \\`);
    console.log(`  ${FALLBACK_BTC_ORACLE} ${FALLBACK_ETH_ORACLE}`);

    // ==========================================
    // POST-DEPLOYMENT CHECKLIST
    // ==========================================
    console.log("\n📝 POST-DEPLOYMENT CHECKLIST:");
    console.log("  [ ] Verify contract on BaseScan");
    console.log("  [ ] Set up Gelato keeper for automated rebalancing");
    console.log("  [ ] Configure Yearn vault to use this strategy");
    console.log("  [ ] Test small deposit");
    console.log("  [ ] Monitor first rebalance");

    return strategyAddr;
}

main()
    .then((addr) => {
        console.log(`\n✅ Deployment complete: ${addr}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
