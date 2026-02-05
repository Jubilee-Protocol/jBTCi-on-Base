/**
 * Mainnet Deployment via Factory - YearnJBTCiStrategy v2.0.0
 * 
 * Uses CREATE2 factory to bypass contract size limit check in eth_estimateGas
 * 
 * Usage:
 *   npx hardhat run deploy/DeployJBTCi_Factory.js --network base
 */

const { ethers } = require("ethers");
const hre = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🚀 Deploying jBTCi v2.0.0 via Factory to BASE MAINNET...\n");
    console.log("⚠️  WARNING: This is a MAINNET deployment!");
    console.log("=".repeat(50));

    // Setup Provider & Wallet
    const provider = new ethers.JsonRpcProvider(hre.network.config.url);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not found in .env");

    const deployer = new ethers.Wallet(privateKey, provider);
    console.log(`Deploying from: ${deployer.address}`);

    const balance = await provider.getBalance(deployer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Helper to get factory
    const getFactory = async (name) => {
        const artifact = await hre.artifacts.readArtifact(name);
        return new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
    };

    // ==========================================
    // STEP 1: Deploy Factory (small contract, no size issues)
    // ==========================================
    console.log("⏳ Step 1: Deploying JBTCiFactory...");

    const FactoryContract = await getFactory("contracts/JBTCiFactory.sol:JBTCiFactory");
    const factory = await FactoryContract.deploy();
    await factory.waitForDeployment();
    const factoryAddr = await factory.getAddress();
    console.log(`  ✅ Factory deployed: ${factoryAddr}`);

    // ==========================================
    // BASE MAINNET ADDRESSES
    // ==========================================
    const WBTC = ethers.getAddress("0x0555e30da8f98308edb960aa94c0db47230d2b9c");
    const CBBTC = ethers.getAddress("0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf");
    const BTC_USD_ORACLE = ethers.getAddress("0x64c997316719ee9e0757755b41295d018b14848f");
    const ETH_USD_ORACLE = ethers.getAddress("0x71041dddad3595f9ced3dccfbe3d1f4b0a16bb70");
    const FALLBACK_BTC_ORACLE = ethers.getAddress("0x4b5b01ffc862d9c06a0b093f83d2b5cc99e16b6e");
    const FALLBACK_ETH_ORACLE = ethers.getAddress("0x3c6cd9cc7c7a4c2cf5a82734cd249d7d593354da");
    const AERODROME_ROUTER = ethers.getAddress("0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43");
    const UNISWAP_ROUTER = ethers.getAddress("0x2626664c2603336e57b271c5c0b26f421741e481");
    const UNISWAP_V3_POOL_WBTC_ETH = ethers.getAddress("0xc9289a5ef42eafa9e07665fcacf46127495cc222");
    const UNISWAP_V3_POOL_CBBTC_USDC = ethers.getAddress("0xfbb6eed8e7aa03b138556eedaf5d271a5e1e43ef");

    // ==========================================
    // STEP 2: Get Strategy bytecode with constructor args
    // ==========================================
    console.log("\n⏳ Step 2: Preparing Strategy bytecode...");

    const StrategyArtifact = await hre.artifacts.readArtifact("contracts/YearnJBTCiStrategy.sol:YearnJBTCiStrategy");
    const strategyFactory = new ethers.ContractFactory(StrategyArtifact.abi, StrategyArtifact.bytecode, deployer);

    // Encode constructor arguments
    const constructorArgs = strategyFactory.interface.encodeDeploy([
        CBBTC,                      // asset
        "jBTCi Strategy v2.0.0",    // name
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
    ]);

    const fullBytecode = StrategyArtifact.bytecode + constructorArgs.slice(2);
    console.log(`  Strategy bytecode: ${fullBytecode.length / 2} bytes`);

    // ==========================================
    // STEP 3: Deploy via Factory (CREATE2)
    // ==========================================
    console.log("\n⏳ Step 3: Deploying Strategy via Factory...");

    const salt = ethers.keccak256(ethers.toUtf8Bytes("jBTCi-v2.0.0-mainnet-" + Date.now()));
    console.log(`  Salt: ${salt}`);

    // Compute expected address
    const expectedAddr = await factory.computeAddress(fullBytecode, salt);
    console.log(`  Expected address: ${expectedAddr}`);

    // Deploy with manual gas limit (bypass estimateGas)
    const tx = await factory.deploy(fullBytecode, salt, {
        gasLimit: 15000000  // 15M gas - should be plenty for large contract
    });

    const receipt = await tx.wait();
    console.log(`  ✅ Transaction: ${receipt.hash}`);

    // Get deployed address from event
    const event = receipt.logs.find(log => {
        try {
            return factory.interface.parseLog(log)?.name === "StrategyDeployed";
        } catch { return false; }
    });

    const strategyAddr = event ? factory.interface.parseLog(event).args.strategy : expectedAddr;

    // Verify deployment
    const code = await provider.getCode(strategyAddr);
    if (code.length < 100) {
        throw new Error("Strategy deployment failed - no code at address!");
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 MAINNET DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(50));
    console.log(`Factory Address: ${factoryAddr}`);
    console.log(`Strategy Address: ${strategyAddr}`);
    console.log(`\nView on BaseScan: https://basescan.org/address/${strategyAddr}`);

    // ==========================================
    // VERIFICATION COMMAND
    // ==========================================
    console.log("\n📋 To verify on BaseScan:");
    console.log(`npx hardhat verify --network base ${strategyAddr} \\`);
    console.log(`  ${CBBTC} "jBTCi Strategy v2.0.0" ${WBTC} ${CBBTC} \\`);
    console.log(`  ${BTC_USD_ORACLE} ${ETH_USD_ORACLE} \\`);
    console.log(`  ${UNISWAP_V3_POOL_WBTC_ETH} ${UNISWAP_V3_POOL_CBBTC_USDC} \\`);
    console.log(`  ${AERODROME_ROUTER} ${UNISWAP_ROUTER} \\`);
    console.log(`  ${FALLBACK_BTC_ORACLE} ${FALLBACK_ETH_ORACLE}`);

    return { factory: factoryAddr, strategy: strategyAddr };
}

main()
    .then((addrs) => {
        console.log(`\n✅ Complete!`);
        console.log(`   Factory: ${addrs.factory}`);
        console.log(`   Strategy: ${addrs.strategy}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
