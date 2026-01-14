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
- Safe wallet integration via WalletConnect
- "Two signatures on a check" messaging
- Step-by-step Safe creation guide

### 🔐 Privy Integration
- Email, Google, LinkedIn login for non-crypto users
- Embedded wallet creation for new users
- Preserves existing RainbowKit wallet connections

---

## Security

- **Audit Score**: 94/100 ⭐⭐⭐⭐⭐
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
| jBTCi Strategy | `0x08F793B353e9C0EF52c9c00aa579c69F6D9DAA1A` |

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
│   │   │   ├── TreasuryMode.tsx     # Safe integration
│   │   │   └── TutorialModal.tsx    # Onboarding
│   │   ├── providers.tsx        # Privy + RainbowKit
│   │   └── page.tsx             # Main app
│   └── .env.local               # NEXT_PUBLIC_PRIVY_APP_ID
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

# Build for production (requires Node 20+)
source ~/.nvm/nvm.sh && nvm use 20 && npm run build
```

---

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```

### Netlify
Add `NEXT_PUBLIC_PRIVY_APP_ID` in Site Settings → Environment Variables

---

## Connecting with Safe Wallet

1. Open mint.jbtci.xyz in a browser
2. Click "Connect Wallet"
3. Select "WalletConnect"
4. Copy the pairing code (`wc:...`)
5. Go to Safe → Apps → WalletConnect
6. Paste the pairing code

---

## Built By

**[Jubilee Labs](https://jubileelabs.xyz)** • Powered by **[Yearn V3](https://yearn.fi)** • Deployed on **[Base](https://base.org)**

## License

This project is licensed under the [MIT License](LICENSE).

---

*"Seek first the Kingdom of God!"* — Matthew 6:33
