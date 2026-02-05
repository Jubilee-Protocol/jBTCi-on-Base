/**
 * Testnet Factory Deployment - Base Sepolia
 * 
 * Tests the factory deployment pattern before mainnet
 * 
 * Usage:
 *   npx hardhat run deploy/DeployJBTCi_FactoryTestnet.js --network baseSepolia
 */

const { ethers } = require("ethers");
const hre = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🧪 Deploying jBTCi v2.0.0 via Factory to BASE SEPOLIA...\n");

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

    // Deploy Factory
    console.log("⏳ Step 1: Deploying JBTCiFactory...");
    const FactoryContract = await getFactory("contracts/JBTCiFactory.sol:JBTCiFactory");
    const factory = await FactoryContract.deploy();
    await factory.waitForDeployment();
    const factoryAddr = await factory.getAddress();
    console.log(`  ✅ Factory deployed: ${factoryAddr}`);

    // Deploy Mock Tokens for testnet
    console.log("\n⏳ Step 2: Deploying Mock Tokens...");
    const MockERC20 = await getFactory("contracts/mocks/MockERC20.sol:MockERC20");

    const wbtc = await MockERC20.deploy("Wrapped BTC", "WBTC", 8);
    await wbtc.waitForDeployment();
    const wbtcAddr = await wbtc.getAddress();
    console.log(`  ✅ WBTC: ${wbtcAddr}`);

    const cbbtc = await MockERC20.deploy("Coinbase BTC", "cbBTC", 8);
    await cbbtc.waitForDeployment();
    const cbbtcAddr = await cbbtc.getAddress();
    console.log(`  ✅ cbBTC: ${cbbtcAddr}`);

    // Deploy Mock Oracles
    console.log("\n⏳ Step 3: Deploying Mock Oracles...");
    const MockOracle = await getFactory("contracts/mocks/MockChainlinkOracle.sol:MockChainlinkOracle");

    const btcOracle = await MockOracle.deploy(9100000000000, 8); // $91,000
    await btcOracle.waitForDeployment();
    const btcOracleAddr = await btcOracle.getAddress();
    console.log(`  ✅ BTC Oracle: ${btcOracleAddr}`);

    const ethOracle = await MockOracle.deploy(310000000000, 8); // $3,100
    await ethOracle.waitForDeployment();
    const ethOracleAddr = await ethOracle.getAddress();
    console.log(`  ✅ ETH Oracle: ${ethOracleAddr}`);

    // Deploy Mock Pools
    console.log("\n⏳ Step 4: Deploying Mock Pools...");
    const MockPool = await getFactory("contracts/mocks/MockUniswapV3Pool.sol:MockUniswapV3Pool");
    const SQRT_PRICE = BigInt("79228162514264337593543950336");

    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    const usdcAddr = await usdc.getAddress();

    const weth = await MockERC20.deploy("Wrapped ETH", "WETH", 18);
    await weth.waitForDeployment();
    const wethAddr = await weth.getAddress();

    const poolWbtcEth = await MockPool.deploy(wbtcAddr, wethAddr, SQRT_PRICE);
    await poolWbtcEth.waitForDeployment();
    const poolWbtcEthAddr = await poolWbtcEth.getAddress();
    console.log(`  ✅ WBTC/ETH Pool: ${poolWbtcEthAddr}`);

    const poolCbbtcUsdc = await MockPool.deploy(cbbtcAddr, usdcAddr, SQRT_PRICE);
    await poolCbbtcUsdc.waitForDeployment();
    const poolCbbtcUsdcAddr = await poolCbbtcUsdc.getAddress();
    console.log(`  ✅ cbBTC/USDC Pool: ${poolCbbtcUsdcAddr}`);

    // Deploy Mock Routers
    console.log("\n⏳ Step 5: Deploying Mock Routers...");
    const MockRouter = await getFactory("contracts/mocks/MockRouter.sol:MockRouter");

    const aeroRouter = await MockRouter.deploy();
    await aeroRouter.waitForDeployment();
    const aeroRouterAddr = await aeroRouter.getAddress();
    console.log(`  ✅ Aerodrome Router: ${aeroRouterAddr}`);

    const uniRouter = await MockRouter.deploy();
    await uniRouter.waitForDeployment();
    const uniRouterAddr = await uniRouter.getAddress();
    console.log(`  ✅ Uniswap Router: ${uniRouterAddr}`);

    // Prepare Strategy bytecode
    console.log("\n⏳ Step 6: Preparing Strategy bytecode...");
    const StrategyArtifact = await hre.artifacts.readArtifact("contracts/YearnJBTCiStrategy.sol:YearnJBTCiStrategy");
    const strategyFactory = new ethers.ContractFactory(StrategyArtifact.abi, StrategyArtifact.bytecode, deployer);

    const constructorArgs = strategyFactory.interface.encodeDeploy([
        cbbtcAddr,              // asset
        "jBTCi Testnet v2.0.0", // name
        wbtcAddr,               // wbtc
        cbbtcAddr,              // cbbtc
        btcOracleAddr,          // btcUsdOracle
        ethOracleAddr,          // ethUsdOracle
        poolWbtcEthAddr,        // uniswapV3PoolWbtcEth
        poolCbbtcUsdcAddr,      // uniswapV3PoolCbbtcUsdc
        aeroRouterAddr,         // aerodromeRouter
        uniRouterAddr,          // uniswapRouter
        btcOracleAddr,          // fallbackBtcOracle (use same for testnet)
        ethOracleAddr           // fallbackEthOracle (use same for testnet)
    ]);

    const fullBytecode = StrategyArtifact.bytecode + constructorArgs.slice(2);
    console.log(`  Bytecode size: ${fullBytecode.length / 2} bytes`);

    // Deploy via Factory
    console.log("\n⏳ Step 7: Deploying Strategy via Factory (CREATE2)...");
    const salt = ethers.keccak256(ethers.toUtf8Bytes("jBTCi-testnet-" + Date.now()));

    const tx = await factory.deploy(fullBytecode, salt, {
        gasLimit: 15000000
    });
    const receipt = await tx.wait();

    // Get deployed address
    const event = receipt.logs.find(log => {
        try { return factory.interface.parseLog(log)?.name === "StrategyDeployed"; }
        catch { return false; }
    });
    const strategyAddr = factory.interface.parseLog(event).args.strategy;

    // Verify deployment
    const code = await provider.getCode(strategyAddr);
    console.log(`  ✅ Strategy deployed: ${strategyAddr}`);
    console.log(`  Code size: ${(code.length - 2) / 2} bytes`);

    console.log("\n" + "=".repeat(50));
    console.log("🎉 TESTNET DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(50));
    console.log(`Factory: ${factoryAddr}`);
    console.log(`Strategy: ${strategyAddr}`);

    return { factory: factoryAddr, strategy: strategyAddr };
}

main()
    .then((addrs) => {
        console.log(`\n✅ Testnet validation complete!`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Testnet deployment failed:", error);
        process.exit(1);
    });
