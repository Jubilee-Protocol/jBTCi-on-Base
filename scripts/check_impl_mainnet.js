const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    console.log("Checking TokenizedStrategy implementation on MAINNET...");
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const address = "0x2e234DAe75C793f67A35089C9d99245E1C58470b";

    const code = await provider.getCode(address);
    console.log(`Address: ${address}`);
    console.log(`Code size: ${code.length}`);

    if (code === "0x") {
        console.error("❌ CRITICAL: No code found on MAINNET! Deposits will fail silently!");
    } else {
        console.log("✅ Code found on mainnet. Address seems valid.");
    }
}

main().catch(console.error);
