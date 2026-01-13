const { ethers } = require("ethers");
const hre = require("hardhat");
require("dotenv").config(); // Force load .env

async function main() {
    console.log("🧪 Deploying jBTCi to TESTNET (with Mocks)...\n");

    // 1. Setup Provider & Wallet manually (since hardhat-ethers is missing)
    const provider = new ethers.JsonRpcProvider(hre.network.config.url);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not found in .env");

    const deployer = new ethers.Wallet(privateKey, provider);

    console.log("Deploying from:", deployer.address);
    // console.log("Balance:", ethers.formatEther(await provider.getBalance(deployer.address)), "ETH\n");

    // Helper to get factory
    const getFactory = async (name) => {
        const artifact = await hre.artifacts.readArtifact(name);
        return new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
    };

    // ============================================
    // 1. DEPLOY MOCK TOKENS
    // ============================================
    console.log("⏳ Deploying Mock Tokens...");

    const MockERC20 = await getFactory("MockERC20");

    const wbtc = await MockERC20.deploy("Wrapped BTC", "WBTC", 8);
    await wbtc.waitForDeployment(); // Ethers v6 syntax
    const wbtcAddr = await wbtc.getAddress();
    console.log("  ✅ Mock WBTC:", wbtcAddr);

    const tbtc = await MockERC20.deploy("Threshold BTC", "tBTC", 18);
    await tbtc.waitForDeployment();
    const tbtcAddr = await tbtc.getAddress();
    console.log("  ✅ Mock tBTC:", tbtcAddr);

    const cbbtc = await MockERC20.deploy("Coinbase BTC", "cbBTC", 8);
    await cbbtc.waitForDeployment();
    const cbbtcAddr = await cbbtc.getAddress();
    console.log("  ✅ Mock cbBTC:", cbbtcAddr);

    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    const usdcAddr = await usdc.getAddress();
    console.log("  ✅ Mock USDC:", usdcAddr);


    // ============================================
    // 2. DEPLOY MOCK ORACLES
    // ============================================
    console.log("\n⏳ Deploying Mock Oracles...");

    const MockOracle = await getFactory("MockChainlinkOracle");

    // BTC @ $100,000 (8 decimals)
    const btcOracle = await MockOracle.deploy(10000000000000, 8);
    await btcOracle.waitForDeployment();
    const btcOracleAddr = await btcOracle.getAddress();
    console.log("  ✅ Mock BTC/USD Oracle:", btcOracleAddr);

    // ETH @ $4,000
    const ethOracle = await MockOracle.deploy(400000000000, 8);
    await ethOracle.waitForDeployment();
    const ethOracleAddr = await ethOracle.getAddress();
    console.log("  ✅ Mock ETH/USD Oracle:", ethOracleAddr);

    // Fallback Oracles
    console.log("  ⏳ Deploying Fallback Oracles...");
    const btcFallback = await MockOracle.deploy(10000000000000, 8);
    await btcFallback.waitForDeployment();
    const btcFallbackAddr = await btcFallback.getAddress();

    const ethFallback = await MockOracle.deploy(400000000000, 8);
    await ethFallback.waitForDeployment();
    const ethFallbackAddr = await ethFallback.getAddress();


    // ============================================
    // 3. DEPLOY MOCK ROUTERS (need 2 different)
    // ============================================
    console.log("\n⏳ Deploying Mock Routers...");

    const MockRouter = await getFactory("MockRouter");

    const aerodromeRouter = await MockRouter.deploy();
    await aerodromeRouter.waitForDeployment();
    const aerodromeRouterAddr = await aerodromeRouter.getAddress();
    console.log("  ✅ Mock Aerodrome Router:", aerodromeRouterAddr);

    const uniswapRouter = await MockRouter.deploy();
    await uniswapRouter.waitForDeployment();
    const uniswapRouterAddr = await uniswapRouter.getAddress();
    console.log("  ✅ Mock Uniswap Router:", uniswapRouterAddr);


    // 4. DEPLOY MOCK V3 POOLS (For TWAP checks)
    // ============================================
    console.log("\n⏳ Deploying Mock V3 Pools (2-asset model)...");

    const MockPool = await getFactory("MockUniswapV3Pool");

    // SqrtPriceX96 for 1:1 ratio is 2^96
    const SQRT_PRICE_1_1 = BigInt("79228162514264337593543950336");

    // Deploy mock WETH for WBTC/ETH pool
    const weth = await MockERC20.deploy("Wrapped ETH", "WETH", 18);
    await weth.waitForDeployment();
    const wethAddr = await weth.getAddress();
    console.log("  ✅ Mock WETH:", wethAddr);

    // WBTC/ETH pool (for BTC price TWAP)
    const poolWbtcEth = await MockPool.deploy(wbtcAddr, wethAddr, SQRT_PRICE_1_1);
    await poolWbtcEth.waitForDeployment();
    const poolWbtcEthAddr = await poolWbtcEth.getAddress();
    console.log("  ✅ Mock WBTC/ETH Pool:", poolWbtcEthAddr);

    // cbBTC/USDC pool
    const poolCbbtcUsdc = await MockPool.deploy(cbbtcAddr, usdcAddr, SQRT_PRICE_1_1);
    await poolCbbtcUsdc.waitForDeployment();
    const poolCbbtcUsdcAddr = await poolCbbtcUsdc.getAddress();
    console.log("  ✅ Mock cbBTC/USDC Pool:", poolCbbtcUsdcAddr);


    // ============================================
    // 5. DEPLOY STRATEGY
    // ============================================
    console.log("\n⏳ Deploying YearnJBTCiStrategy...");
    console.log("  Using TokenizedStrategy impl:", await provider.getCode("0x4FEFcCf08c65AD172C57b62d046edd838e1f1d69").then(c => c.length > 2 ? "✅ Found" : "❌ Missing"));

    const STRATEGY_NAME = "Jubilee Bitcoin Index (Testnet)";

    const YearnJBTCiStrategy = await getFactory("contracts/YearnJBTCiStrategy.sol:YearnJBTCiStrategy");
    const strategy = await YearnJBTCiStrategy.deploy(
        cbbtcAddr,              // _asset (cbBTC as base asset)
        STRATEGY_NAME,          // _name
        wbtcAddr,               // _wbtc
        cbbtcAddr,              // _cbbtc
        btcOracleAddr,          // _btcUsdOracle
        ethOracleAddr,          // _ethUsdOracle
        poolWbtcEthAddr,        // _uniswapV3PoolWbtcEth
        poolCbbtcUsdcAddr,      // _uniswapV3PoolCbbtcUsdc
        aerodromeRouterAddr,    // _aerodromeRouter
        uniswapRouterAddr,      // _uniswapRouter
        btcFallbackAddr,        // _fallbackBtcOracle
        ethFallbackAddr         // _fallbackEthOracle
    );

    await strategy.waitForDeployment();
    const strategyAddr = await strategy.getAddress();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 TESTNET DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(50));
    console.log("Strategy Address:", strategyAddr);

    // ============================================
    // 6. MINT INITIAL TOKENS (For testing)
    // ============================================
    console.log("\n⏳ Minting test tokens...");

    // User provided address
    const TEST_WALLET = "0x0cC95b9b4CDBBAe45d78FBa16237528343d7B79e";
    const mintAmount = ethers.parseUnits("10", 8); // 10 BTC

    // Mint to deployer
    await cbbtc.mint(deployer.address, mintAmount);
    await wbtc.mint(deployer.address, mintAmount);
    console.log("✅ Minted 10 cbBTC/WBTC to Deployer:", deployer.address);

    // Mint to specific test wallet if different
    if (deployer.address.toLowerCase() !== TEST_WALLET.toLowerCase()) {
        await cbbtc.mint(TEST_WALLET, mintAmount);
        await wbtc.mint(TEST_WALLET, mintAmount);
        console.log("✅ Minted 10 cbBTC/WBTC to Test Wallet:", TEST_WALLET);
    }

    console.log("Done! You can now test 'deposit()' on the strategy.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
