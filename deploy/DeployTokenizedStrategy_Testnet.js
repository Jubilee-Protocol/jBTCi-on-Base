/**
 * Deploy TokenizedStrategy Implementation to Base Sepolia Testnet
 * 
 * This deploys the Yearn V3 TokenizedStrategy so strategies can work on testnet.
 * On mainnet, Yearn has already deployed this at 0xBB51273D6c746910C7C06fe718f30c936170feD0
 */

const { ethers } = require("ethers");
const hre = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🧪 Deploying TokenizedStrategy to Base Sepolia Testnet...\n");

    const provider = new ethers.JsonRpcProvider(hre.network.config.url);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not found in .env");

    const deployer = new ethers.Wallet(privateKey, provider);
    console.log("Deploying from:", deployer.address);

    const getFactory = async (name) => {
        const artifact = await hre.artifacts.readArtifact(name);
        return new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
    };

    // Deploy a mock factory (just needs to exist, can be any address for testnet)
    // In production, this would be the real Yearn factory
    console.log("⏳ Deploying Mock Factory...");
    const MockFactory = await getFactory("MockERC20"); // Use any simple contract
    const mockFactory = await MockFactory.deploy("MockFactory", "MF", 18);
    await mockFactory.waitForDeployment();
    const factoryAddr = await mockFactory.getAddress();
    console.log("  ✅ Mock Factory:", factoryAddr);

    // Deploy TokenizedStrategy implementation
    console.log("\n⏳ Deploying TokenizedStrategy Implementation...");
    const TokenizedStrategy = await getFactory("contracts/lib/tokenized-strategy/TokenizedStrategy.sol:TokenizedStrategy");
    const tokenizedStrategy = await TokenizedStrategy.deploy(factoryAddr);
    await tokenizedStrategy.waitForDeployment();
    const implAddr = await tokenizedStrategy.getAddress();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 TOKENIZED STRATEGY DEPLOYED!");
    console.log("=".repeat(50));
    console.log("Implementation Address:", implAddr);
    console.log("\n⚠️  IMPORTANT: Update BaseStrategy.sol with this address:");
    console.log(`   tokenizedStrategyAddress = ${implAddr}`);

    return implAddr;
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
