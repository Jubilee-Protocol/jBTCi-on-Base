const { ethers } = require("ethers");

async function main() {
    // Check BOTH testnet and mainnet
    const configs = [
        {
            name: "MAINNET",
            rpc: "https://mainnet.base.org",
            strategy: "0x7d0Ae1Fa145F3d5B511262287fF686C25000816D",
            cbBTC: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
            wBTC: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c"
        },
        {
            name: "TESTNET",
            rpc: "https://sepolia.base.org",
            strategy: "0x08F793B353e9C0EF52c9c00aa579c69F6D9DAA1A",
            cbBTC: "0x5552ce4C7c6821A43fD53aB2E4fBd28d2B8c5A5d",
            wBTC: "0xbf7690ec2cD04F1B108f2a6e10D80039dcb589bb"
        }
    ];

    const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
    const strategyAbi = [
        "function totalAssets() view returns (uint256)",
        "function asset() view returns (address)"
    ];

    for (const cfg of configs) {
        console.log(`\n${"=".repeat(50)}`);
        console.log(`🔍 ${cfg.name}`);
        console.log(`${"=".repeat(50)}`);

        const provider = new ethers.JsonRpcProvider(cfg.rpc);

        // Check token balances directly on strategy address
        const cbBTC = new ethers.Contract(cfg.cbBTC, erc20Abi, provider);
        const wBTC = new ethers.Contract(cfg.wBTC, erc20Abi, provider);
        const strategy = new ethers.Contract(cfg.strategy, strategyAbi, provider);

        try {
            const cbbtcBal = await cbBTC.balanceOf(cfg.strategy);
            console.log(`\ncbBTC balance held by strategy: ${ethers.formatUnits(cbbtcBal, 8)}`);

            const wbtcBal = await wBTC.balanceOf(cfg.strategy);
            console.log(`WBTC balance held by strategy: ${ethers.formatUnits(wbtcBal, 8)}`);

            const assetAddr = await strategy.asset();
            console.log(`\nStrategy asset address: ${assetAddr}`);
            console.log(`Configured cbBTC address: ${cfg.cbBTC}`);
            console.log(`Match: ${assetAddr.toLowerCase() === cfg.cbBTC.toLowerCase() ? '✅ YES' : '❌ NO'}`);

            const assetContract = new ethers.Contract(assetAddr, erc20Abi, provider);
            const assetBal = await assetContract.balanceOf(cfg.strategy);
            console.log(`\nAsset balance (this is what gets counted as TVL): ${ethers.formatUnits(assetBal, 8)}`);

            const totalAssets = await strategy.totalAssets();
            console.log(`totalAssets(): ${ethers.formatUnits(totalAssets, 8)}`);

            const total = Number(cbbtcBal) + Number(wbtcBal) + Number(assetBal);
            console.log(`\nManual total (cbBTC + WBTC + asset): ${ethers.formatUnits(BigInt(Math.ceil(total)), 8)}`);

            if (total > 0) {
                const wbtcPct = (Number(wbtcBal) / total * 100).toFixed(2);
                const cbbtcPct = (Number(cbbtcBal) / total * 100).toFixed(2);
                console.log(`\nCalculated allocations:`);
                console.log(`  WBTC: ${wbtcPct}%`);
                console.log(`  cbBTC: ${cbbtcPct}%`);
            }

        } catch (e) {
            console.log(`Error: ${e.message.slice(0, 100)}`);
        }
    }
}

main().catch(console.error);
