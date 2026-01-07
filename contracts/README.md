# jBTCi Contracts

This directory contains the smart contracts for jBTCi - The Bitcoin Index Fund.

## Main Contracts

| Contract | Description |
|----------|-------------|
| `YearnJBTCiStrategy.sol` | Main strategy - 50/50 WBTC/cbBTC rebalancing |
| `JubileeTimelock.sol` | 24-hour governance timelock |

## Libraries

| Library | Purpose |
|---------|---------|
| `lib/` | Yearn V3 base strategy implementation |
| `libraries/FullMath.sol` | Overflow-safe math operations |

## Mocks (Testing Only)

| Mock | Purpose |
|------|---------|
| `MockChainlinkOracle.sol` | Simulates Chainlink price feeds |
| `MockUniswapV3Pool.sol` | Simulates Uniswap V3 TWAP |
| `MockRouter.sol` | Simulates DEX routing |

---

**Deployed**: [`0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3`](https://basescan.org/address/0x8080d5Ac768B69Cb64d37524A2659d31281f8bA3)
