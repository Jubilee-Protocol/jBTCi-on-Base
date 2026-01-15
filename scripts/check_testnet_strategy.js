const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

    const addresses = [
        { name: "config.ts address", addr: "0xd0d92320555F3883fB20D84A6b372A511DD538C4" },
        { name: "test script address", addr: "0x08F793B353e9C0EF52c9c00aa579c69F6D9DAA1A" }
    ];

    const abi = [
        "function totalAssets() view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function asset() view returns (address)",
        "function name() view returns (string)"
    ];

    for (const { name, addr } of addresses) {
        console.log(`\n🔍 Checking ${name}: ${addr}`);

        const code = await provider.getCode(addr);
        console.log("   Code length:", code.length);

        if (code === "0x") {
            console.log("   ❌ No contract at this address");
            continue;
        }

        const contract = new ethers.Contract(addr, abi, provider);

        try {
            const name = await contract.name();
            console.log("   Name:", name);
        } catch (e) {
            console.log("   Name: failed");
        }

        try {
            const asset = await contract.asset();
            console.log("   Asset:", asset);
        } catch (e) {
            console.log("   Asset: failed");
        }

        try {
            const total = await contract.totalAssets();
            console.log("   Total Assets:", ethers.formatUnits(total, 8), "BTC");
        } catch (e) {
            console.log("   Total Assets: failed");
        }

        try {
            const supply = await contract.totalSupply();
            console.log("   Total Supply:", ethers.formatUnits(supply, 8), "jBTCi");
        } catch (e) {
            console.log("   Total Supply: failed");
        }
    }
}

main().catch(console.error);
