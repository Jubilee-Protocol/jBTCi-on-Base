const { ethers } = require("ethers");
require("dotenv").config();

// New testnet strategy address (from latest deployment)
const STRATEGY_ADDRESS = "0x08F793B353e9C0EF52c9c00aa579c69F6D9DAA1A";
const CB_BTC_ADDRESS = "0x5552ce4C7c6821A43fD53aB2E4fBd28d2B8c5A5d";

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
];

const STRATEGY_ABI = [
    "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
    "function totalAssets() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function asset() view returns (address)",
    "function convertToAssets(uint256 shares) view returns (uint256)",
    "function isShutdown() view returns (bool)",
];

async function main() {
    console.log("🧪 Testing Deposit on Fixed Testnet Strategy...\n");

    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not found in .env");

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Testing with wallet: ${wallet.address}\n`);

    const strategy = new ethers.Contract(STRATEGY_ADDRESS, STRATEGY_ABI, wallet);
    const cbBTC = new ethers.Contract(CB_BTC_ADDRESS, ERC20_ABI, wallet);

    // Check strategy is working
    console.log("1️⃣ Checking strategy view functions...");
    try {
        const totalAssets = await strategy.totalAssets();
        console.log(`   Total Assets: ${ethers.formatUnits(totalAssets, 8)} BTC`);

        const totalSupply = await strategy.totalSupply();
        console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 8)} jBTCi`);

        const isShutdown = await strategy.isShutdown();
        console.log(`   Is Shutdown: ${isShutdown}`);

        const asset = await strategy.asset();
        console.log(`   Underlying Asset: ${asset}`);
        console.log("   ✅ Strategy view functions working!\n");
    } catch (e) {
        console.error("   ❌ Strategy view functions FAILED:", e.message);
        return;
    }

    // Check cbBTC balance
    console.log("2️⃣ Checking cbBTC balance...");
    const cbBTCBalance = await cbBTC.balanceOf(wallet.address);
    console.log(`   cbBTC Balance: ${ethers.formatUnits(cbBTCBalance, 8)} cbBTC`);

    if (cbBTCBalance === 0n) {
        console.log("   ❌ No cbBTC to deposit");
        return;
    }

    // Check jBTCi balance before
    console.log("\n3️⃣ Checking jBTCi balance BEFORE deposit...");
    const jBTCiBefore = await strategy.balanceOf(wallet.address);
    console.log(`   jBTCi Balance: ${ethers.formatUnits(jBTCiBefore, 8)} jBTCi`);

    // Approve and deposit
    const depositAmount = ethers.parseUnits("0.1", 8); // 0.1 BTC
    console.log(`\n4️⃣ Depositing ${ethers.formatUnits(depositAmount, 8)} cbBTC...`);

    // Check allowance
    const allowance = await cbBTC.allowance(wallet.address, STRATEGY_ADDRESS);
    if (allowance < depositAmount) {
        console.log("   Approving cbBTC...");
        const approveTx = await cbBTC.approve(STRATEGY_ADDRESS, depositAmount * 10n);
        await approveTx.wait();
        console.log("   ✅ Approved");
    }

    // Deposit
    console.log("   Sending deposit transaction...");
    const depositTx = await strategy.deposit(depositAmount, wallet.address);
    console.log(`   Tx Hash: ${depositTx.hash}`);
    const receipt = await depositTx.wait();
    console.log(`   ✅ Deposit confirmed in block ${receipt.blockNumber}`);

    // Check balances after
    console.log("\n5️⃣ Checking balances AFTER deposit...");
    const jBTCiAfter = await strategy.balanceOf(wallet.address);
    console.log(`   jBTCi Balance: ${ethers.formatUnits(jBTCiAfter, 8)} jBTCi`);

    const cbBTCAfter = await cbBTC.balanceOf(wallet.address);
    console.log(`   cbBTC Balance: ${ethers.formatUnits(cbBTCAfter, 8)} cbBTC`);

    const totalAssetsAfter = await strategy.totalAssets();
    console.log(`   Strategy Total Assets: ${ethers.formatUnits(totalAssetsAfter, 8)} BTC`);

    if (jBTCiAfter > jBTCiBefore) {
        console.log("\n🎉 SUCCESS! jBTCi tokens received!");
        console.log(`   Minted: ${ethers.formatUnits(jBTCiAfter - jBTCiBefore, 8)} jBTCi`);
    } else {
        console.error("\n❌ FAILED: No jBTCi tokens received");
    }
}

main().catch(console.error);
