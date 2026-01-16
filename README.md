# jBTCi - The Bitcoin Index Fund

[![Built on Base](https://img.shields.io/badge/Built%20on-Base-blue)](https://base.org)
[![Powered by Yearn](https://img.shields.io/badge/Powered%20by-Yearn%20V3-purple)](https://yearn.fi)
[![App](https://img.shields.io/badge/App-mint.jbtci.xyz-pink)](https://mint.jbtci.xyz)

> A passive, diversified Bitcoin strategy that automatically rebalances between WBTC and cbBTC while capturing arbitrage opportunities.

**Website**: https://jbtci.xyz  
**App**: https://mint.jbtci.xyz  
**Contract**: `TBD - Mainnet deployment pending`

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

### Safe Apps Integration
jBTCi is compatible with [Safe Apps SDK](https://github.com/safe-global/safe-apps-sdk) for multi-signature treasury management. To use jBTCi with Safe:

1. Go to app.safe.global
2. Open your Safe on Base
3. Click **Apps** → **My custom apps**
4. Add: `https://mint.jbtci.xyz`
5. jBTCi auto-connects when opened from Safe!

---

## Security

- **Audit Score**: 97/100 ⭐⭐⭐⭐⭐
- See [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md) for details

---

## Contract Addresses

### Base Mainnet
| Contract | Address |
|----------|---------|
| jBTCi Strategy | `TBD` |
| cbBTC | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` |
| WBTC | `0x0555E30da8f98308EdB960aa94C0Db47230d2B9c` |

### Base Sepolia (Testnet)
| Contract | Address |
|----------|---------|
| jBTCi Strategy | `0xd0d92320555F3883fB20D84A6b372A511DD538C4` |
| cbBTC | `0xfE7984100E4DAc864b1B0FfeebC25bADA0D2C782` |
| WBTC | `0xbf7690ec2cD04F1B108f2a6e10D80039dcb589bb` |

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

## Changelog (Jan 7-16, 2026)

### Contract Fixes
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
