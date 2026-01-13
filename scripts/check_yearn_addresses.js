const { ethers } = require("ethers");
require("dotenv").config();

// Check official Yearn TokenizedStrategy addresses
// Based on Yearn docs, these should be deployed via CREATE2 at same address on all chains

async function main() {
    console.log("🔍 Checking Yearn V3 TokenizedStrategy on Base Mainnet...\n");

    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");

    // The address in BaseStrategy.sol (testing/placeholder)
    const PLACEHOLDER_ADDRESS = "0x2e234DAe75C793f67A35089C9d99245E1C58470b";

    // Known Yearn V3 TokenizedStrategy addresses (same across chains via CREATE2)
    // Reference: https://docs.yearn.fi/developers/v3/protocol_fees
    const KNOWN_ADDRESSES = {
        "v3.0.4 TokenizedStrategy": "0xBB51273D6c746910C7C06fe718f30c936170feD0",
        "v3.0.3 TokenizedStrategy": "0x254A93feff3BED3B34B0fCA6bC9d022eB0dA8ce7",
        "v3.0.2 TokenizedStrategy": "0x12A537F5438282d25Cb2F6F8C1b3CbBc4168aBB5",
        "v3.0.1 TokenizedStrategy": "0xDFC8cD9F2f2d306b7C0d109F005DF661D2b14BED",
    };

    console.log("Placeholder address in BaseStrategy.sol:");
    let code = await provider.getCode(PLACEHOLDER_ADDRESS);
    console.log(`  ${PLACEHOLDER_ADDRESS}: ${code === "0x" ? "❌ NO CODE" : "✅ Has code (" + code.length + " bytes)"}\n`);

    console.log("Known Yearn V3 TokenizedStrategy addresses:");
    for (const [name, addr] of Object.entries(KNOWN_ADDRESSES)) {
        code = await provider.getCode(addr);
        console.log(`  ${name}: ${addr}`);
        console.log(`    ${code === "0x" ? "❌ NO CODE" : "✅ Has code (" + code.length + " bytes)"}`);
    }
}

main().catch(console.error);
