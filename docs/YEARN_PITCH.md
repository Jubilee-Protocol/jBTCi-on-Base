# Yearn Partnership Pitch: jBTCi Strategy

## What is jBTCi?

**jBTCi (Jubilee Bitcoin Index)** is a tokenized Bitcoin index fund that maintains a diversified 50/50 allocation between **WBTC** and **cbBTC** on Base L2.

---

## 💡 Value Proposition

| Feature | Benefit |
|---------|---------|
| **Automatic Rebalancing** | Maintains 50/50 split without user intervention |
| **Dual Oracle Security** | Chainlink + Uniswap TWAP prevents manipulation |
| **Circuit Breaker** | Auto-pauses after 3 failed operations |
| **MEV Protection** | Price deviation checks prevent sandwich attacks |
| **Rate Limiting** | 2000 BTC daily swap cap prevents drain exploits |

---

## 📊 Why This Strategy?

### Problem
- Users want BTC exposure on Base but may be unsure which wrapped BTC to hold
- WBTC has legacy trust, cbBTC is Coinbase-native
- Manual rebalancing is tedious and gas-inefficient

### Solution
- jBTCi abstracts the decision: hold *both* in equal measure
- Single deposit, diversified exposure
- Automated rebalancing on-chain

---

## 🔒 Security

**Audit Score: 97/100** ⭐⭐⭐⭐⭐

| Category | Score |
|----------|-------|
| Access Control | 18/20 |
| Reentrancy Protection | 20/20 |
| Oracle Security | 18/20 |
| Input Validation | 20/20 |
| Economic Security | 18/20 |

Full audit report by Jubilee Labs is available upon request.

---

## 🏗️ Technical Details

- **Built on**: Yearn V3 `BaseStrategy`
- **Asset**: cbBTC (ERC20, 8 decimals)
- **Index Components**: WBTC (50%), cbBTC (50%)
- **Rebalance Threshold**: 2% deviation triggers swap
- **Starting Deposit Cap**: 50 BTC (configurable)
- **Max Deposit Cap**: 1000 BTC 

---

## 📈 Target Market

- Passive BTC holders on Base
- DeFi users seeking diversified BTC exposure
- Yearn users looking for BTC-denominated yield (from rebalancing arb)

---

## 🤝 What We're Asking

1. **Review** of our strategy for potential inclusion in a Yearn vault
2. **Consideration** for official listing on yearn.finance
3. **Feedback** on any improvements needed

---

## 📎 Resources

- **GitHub**: [Jubilee Protocol](https://github.com/Jubilee-Protocol)
- **Website**: [JubileeProtocol.xyz](https://jubileeprotocol.xyz)
- **Audit Report**: Available in repo (`docs/AUDIT_REPORT.md`)
- **Contact**: [Jubilee Labs](mailto:contact@jubileeprotocol.xyz)

---

## 🙏 Closing

We believe jBTCi fills a gap in the Yearn ecosystem: a simple, safe way to hold diversified BTC on Base. We'd love to partner with Yearn to bring this to users.

---

**Submitted by**: Jubilee Labs  
**Date**: January 2026
