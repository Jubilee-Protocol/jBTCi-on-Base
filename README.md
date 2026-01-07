# jBTCi - The Bitcoin Index Fund

[![Verified on BaseScan](https://img.shields.io/badge/BaseScan-Verified-green)](https://basescan.org/address/0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3)
[![Built on Base](https://img.shields.io/badge/Built%20on-Base-blue)](https://base.org)
[![Powered by Yearn](https://img.shields.io/badge/Powered%20by-Yearn%20V3-purple)](https://yearn.fi)

> A passive, diversified Bitcoin strategy that automatically rebalances between WBTC and cbBTC while capturing arbitrage opportunities.

**Website**: https://jbtci.xyz  
**Contract**: [`0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3`](https://basescan.org/address/0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3)

---

## Overview

jBTCi maintains a 50/50 allocation between WBTC and cbBTC, automatically rebalancing when allocations drift beyond 2%. The strategy captures arbitrage profits during rebalancing, generating 6-10% target APY for depositors.

### Key Features

- **Passive Strategy** - Set it, forget it, earn BTC
- **Diversified** - 50/50 WBTC/cbBTC allocation
- **Secure** - Multi-layered circuit breakers, dual oracles
- **Efficient** - 100% capital efficiency on Base

---

## Security

- **Audit Score**: 97/100 ⭐⭐⭐⭐⭐
- **Verified**: [BaseScan](https://basescan.org/address/0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3#code)

See [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md) for details.

---

## Repository Structure

```
jBTCi-on-Base/
├── contracts/
│   ├── YearnJBTCiStrategy.sol   # Main strategy (67KB)
│   ├── JubileeTimelock.sol      # 24hr governance
│   ├── lib/                     # Yearn V3 base strategy
│   ├── libraries/               # FullMath overflow protection
│   └── mocks/                   # Test mocks
├── deploy/
│   ├── DeployJBTCi_Mainnet.js   # Production deployment
│   ├── DeployJBTCi_Testnet.js   # Testnet with mocks
│   └── DeployTimelock.js        # Timelock deployment
├── docs/
│   ├── ADMIN_GUIDE.md           # Admin functions reference
│   ├── AUDIT_REPORT.md          # Security audit (97/100)
│   └── YEARN_PITCH.md           # Partnership materials
├── frontend/                    # Next.js web app
├── scripts/                     # Test & utility scripts
└── README.md
```

---

## Contract Addresses

### Base Mainnet
| Contract | Address |
|----------|---------|
| jBTCi Strategy | `0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3` |
| cbBTC | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` |
| WBTC | `0x0555E30da8f98308EdB960aa94C0Db47230d2B9c` |

---

## Quick Start

```bash
# Install
npm install

# Compile
npx hardhat compile

# Deploy (testnet)
npx hardhat run deploy/DeployJBTCi_Testnet.js --network baseSepolia
```

---

## Built By

**[Jubilee Labs](https://jubileelabs.xyz)** • Powered by **[Yearn V3](https://yearn.fi)** • Deployed on **[Base](https://base.org)**

---

*"Seek first the Kingdom of God!"* — Matthew 6:33
