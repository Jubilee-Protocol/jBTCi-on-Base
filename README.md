# jBTCi - The Bitcoin Index Fund

[![Built on Base](https://img.shields.io/badge/Built%20on-Base-blue)](https://base.org)
[![Powered by Yearn](https://img.shields.io/badge/Powered%20by-Yearn%20V3-purple)](https://yearn.fi)
[![Donate Crypto](https://img.shields.io/badge/Donate-Crypto-f7931a?logo=bitcoin&logoColor=white)](https://commerce.coinbase.com/checkout/122a2979-e559-44b9-bb9d-2ff0c6a3025b)

> A passive, diversified Bitcoin strategy that automatically rebalances between WBTC and cbBTC while capturing arbitrage opportunities.

**Website**: https://jbtci.xyz  
**App**: https://mint.jbtci.xyz  
**Contract**: [`0x8a4C0254258F0D3dB7Bc5C5A43825Bb4EfC81337`](https://basescan.org/address/0x8a4C0254258F0D3dB7Bc5C5A43825Bb4EfC81337)  
**Status**: 🚀 **LIVE on Base Mainnet** — Upgraded Jan 18, 2026

---

## Overview

jBTCi maintains a 50/50 allocation between WBTC and cbBTC, automatically rebalancing when allocations drift beyond 2%. The strategy captures arbitrage profits during rebalancing, generating 6-10% target APY for depositors.

### Key Features

- **Passive Strategy** - Set it, forget it, earn BTC
- **Diversified** - 50/50 WBTC/cbBTC allocation  
- **Secure** - Multi-layered circuit breakers, dual oracles
- **Efficient** - 100% capital efficiency on Base

---

## Frontend Features

### 📊 FASB Fair Value Dashboard
- Quarterly and custom date range reporting
- Holdings table with real-time fair value
- Unrealized gain/loss calculations
- CSV export for accountants (FASB ASU 2023-08 compliance)

### 🏛️ Treasury Mode (Multi-Signature Accountability)
- For church treasuries and organizations
- Safe wallet integration via Safe Apps SDK
- "Two signatures on a check" messaging
- Step-by-step Safe creation guide

### Safe Apps Integration ✅
jBTCi is fully compatible with [Safe (formerly Gnosis Safe)](https://app.safe.global) for multi-signature treasury management.

**Features:**
- ✅ Auto-connects when opened inside Safe
- ✅ Multi-sig transaction flow
- ✅ No separate wallet connection needed
- ✅ Works with Base mainnet and testnet

**Setup:**
1. Go to [app.safe.global](https://app.safe.global)
2. Open your Safe on Base
3. Click **Apps** → **My custom apps** → **Add**
4. Enter: `https://mint.jbtci.xyz`
5. Click **Add** (accept the disclaimer)
6. Open jBTCi from Safe - it auto-connects!

**Multi-Sig Workflow:**
1. One signer initiates deposit/withdrawal
2. Other signers approve in Safe
3. Transaction executes after threshold reached

---

## Security

- **Audit Score**: 92/100 ⭐⭐⭐⭐⭐
- See [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md) for details

---

## Contract Addresses

### Base Mainnet
| Contract | Address |
|----------|---------|
| jBTCi Strategy | `0x8a4C0254258F0D3dB7Bc5C5A43825Bb4EfC81337` |
| cbBTC | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` |
| WBTC | `0x0555E30da8f98308EdB960aa94C0Db47230d2B9c` |

### Base Sepolia (Testnet)
| Contract | Address |
|----------|---------|
| jBTCi Strategy | `0x43814Da4b3CB4344395A85afF2325282A43cbda6` |
| cbBTC (Mock) | `0x0D1feA7B0f63A9DA5b0dA89faFfBb56192d7cd93` |
| WBTC (Mock) | `0x5ed96C75f5F04A94308623A8828B819E7Ef60B1c` |

---

## Repository Structure

```
jBTCi-on-Base/
├── contracts/
│   ├── YearnJBTCiStrategy.sol   # Main strategy
│   ├── JubileeTimelock.sol      # 24hr governance
│   └── lib/                     # Yearn V3 base strategy
├── deploy/
│   ├── DeployJBTCi_Mainnet.js   # Production deployment
│   └── DeployJBTCi_Testnet.js   # Testnet with mocks
├── docs/
│   ├── ADMIN_GUIDE.md           # Admin functions
│   └── AUDIT_REPORT.md          # Security audit
├── frontend/                    # Next.js web app
│   ├── app/
│   │   ├── components/
│   │   │   ├── FASBDashboard.tsx    # Fair value reporting
│   │   │   └── TreasuryMode.tsx     # Safe integration
│   │   ├── hooks/
│   │   │   └── useSafeApps.ts       # Safe Apps SDK hook
│   │   ├── providers.tsx        # RainbowKit config
│   │   └── page.tsx             # Main app
│   └── public/
│       └── manifest.json        # Safe Apps manifest
└── README.md
```

---

## Quick Start

```bash
# Install
npm install

# Compile contracts
npx hardhat compile

# Run frontend locally
cd frontend && npm run dev

# Build for production
cd frontend && npm run build
```

---

## Maintenance Mode

During maintenance, mainnet deposits/withdrawals are disabled but **testnet (Base Sepolia) remains available** for testing. Switch to Base Sepolia in your wallet to test functionality.

---

## Changelog (Jan 7-17, 2026)

### Contract Fixes
- ✅ **Jan 17**: Fixed critical `tokenizedStrategyAddress` pointing to testnet instead of mainnet
- ✅ Mainnet redeployment: `0x8a4C0254258F0D3dB7Bc5C5A43825Bb4EfC81337`
- ✅ Fixed critical double-counting bug in `_calculateTotalHoldings()`
- ✅ Fixed same bug in `getAllocationDetails()`
- ✅ Testnet redeployment: `0x43814Da4b3CB4344395A85afF2325282A43cbda6`

### Test Suite (100% Pass Rate)
- ✅ `scripts/stress_test.js` - 11/11 applicable tests
- ✅ `scripts/integration_test.js` - 8/8 tests
- ✅ `scripts/fuzz_test.js` - 165/165 random input tests

### Frontend Improvements
- ✅ One-time infinite approval (no repeated approval popups)
- ✅ Error handling for cancelled/failed transactions in toast
- ✅ FASB Dashboard now network-aware (mainnet/testnet)
- ✅ Mobile viewport fixes for MetaMask browser
- ✅ Safe Apps SDK manifest updates for multi-sig support

### Security
- ✅ Comprehensive audit: 92/100 score
- ✅ Audit report: `contracts/AUDIT_REPORT.md`

---

## Built By

**[Jubilee Labs](https://jubileelabs.xyz)** • Powered by **[Yearn V3](https://yearn.fi)** • Deployed on **[Base](https://base.org)**

## License

This project is licensed under the [MIT License](LICENSE).

---

*"Seek first the Kingdom of God!"* — Matthew 6:33
