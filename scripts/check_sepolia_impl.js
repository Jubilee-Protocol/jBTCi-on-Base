const { ethers } = require("ethers");

async function main() {
    console.log("🔍 Checking Yearn V3 TokenizedStrategy on Base Sepolia (Testnet)...\n");

    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

    // Official Yearn v3.0.4 TokenizedStrategy 
    const YEARN_ADDRESS = "0xBB51273D6c746910C7C06fe718f30c936170feD0";

    const code = await provider.getCode(YEARN_ADDRESS);
    console.log(`Address: ${YEARN_ADDRESS}`);
    console.log(`Code size: ${code.length}`);

    if (code === "0x") {
        console.error("❌ NO CODE on Base Sepolia testnet!");
        console.log("\nThe Yearn TokenizedStrategy is only deployed on mainnet, not testnet.");
        console.log("For testnet, we need to deploy our own TokenizedStrategy implementation.");
    } else {
        console.log("✅ Code found on testnet. TokenizedStrategy is deployed.");
    }
}

main().catch(console.error);
