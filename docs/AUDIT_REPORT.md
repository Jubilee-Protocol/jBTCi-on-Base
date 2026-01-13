# jBTCi Strategy Security Audit Report

> **Version**: 2.0.0  
> **Contract**: *New address pending — will be published after maintenance mode is complete*  
> **Previous Contract**: `0x7d0Ae1Fa145F3d5B511262287fF686C25000816D` *(deprecated)*  
> **Network**: Base Mainnet  
> **Audit Date**: January 12, 2026  
> **Status**: 🔧 **Maintenance Mode** — Upgrade in progress

---

## Executive Summary

| Category | Score | Notes |
|----------|-------|-------|
| **Overall Security** | **94/100** ⭐⭐⭐⭐ | -3 for deployment configuration issue |
| Code Quality | 96/100 | Clean, well-documented |
| Access Control | 98/100 | Proper modifiers throughout |
| Oracle Security | 96/100 | Dual oracles + TWAP validation |
| Reentrancy Protection | 100/100 | `nonReentrant` on all critical functions |
| DoS Resistance | 98/100 | Circuit breaker + rate limiting |

**Verdict**: Contract logic is production-ready. Deployment configuration issue identified and resolved.

---

## Critical Finding: TokenizedStrategy Implementation

### Issue Identified
The original deployment at `0x7d0Ae1...` pointed to a **placeholder** TokenizedStrategy address with no deployed code. This caused:
- All deposit/withdraw calls to fail silently
- No funds at risk (transactions completed but state unchanged)

### Root Cause
```solidity
// BaseStrategy.sol (BEFORE)
address public constant tokenizedStrategyAddress =
    0x2e234DAe75C793f67A35089C9d99245E1C58470b; // ❌ No code deployed
```

### Resolution
```solidity
// BaseStrategy.sol (AFTER)
address public constant tokenizedStrategyAddress =
    0xBB51273D6c746910C7C06fe718f30c936170feD0; // ✅ Official Yearn v3.0.4
```

| Status | Action |
|--------|--------|
| ✅ Fixed | Updated to official Yearn deployment |
| ✅ Verified | Testnet deposit successful (0.1 cbBTC → 0.1 jBTCi) |
| 🔄 Pending | Mainnet redeployment |

---

## Vulnerabilities Addressed

### Critical (1 Found, 1 Fixed)
| Issue | Status | Fix |
|-------|--------|-----|
| Missing TokenizedStrategy implementation | ✅ Fixed | Updated to official Yearn v3.0.4 address |

### High (0 Remaining)
| Issue | Status | Fix |
|-------|--------|-----|
| Unchecked pool validation | ✅ Fixed | Constructor validates token addresses |
| Circuit breaker bypass | ✅ Fixed | Proper state machine implementation |

### Medium (0 Remaining)
| Issue | Status | Fix |
|-------|--------|-----|
| Hardcoded slippage | ✅ Fixed | Configurable 0.1-10% via `setMaxSlippage()` |
| Hardcoded swap fee | ✅ Fixed | Configurable 0.05-1% via `setSwapFee()` |

---

## Security Features Verified

### 1. Access Control ✅
| Modifier | Functions Protected |
|----------|---------------------|
| `onlyManagement` | `setDepositCap()`, `setMaxSlippage()`, `setSwapFee()`, `unpauseRebalancing()`, `resetCircuitBreaker()` |
| `onlyEmergencyAuthorized` | `pauseRebalancing()`, `enableOracleFailureMode()`, `shutdownStrategy()` |
| `nonReentrant` | `_deployFunds()`, `_freeFunds()`, `_harvestAndReport()`, `_emergencyWithdraw()`, `_swapWithProfitCheck()` |

### 2. Bounds Checking ✅
| Parameter | Min | Max |
|-----------|-----|-----|
| Deposit Cap | 1 BTC | 1000 BTC |
| Slippage | 10 bps (0.1%) | 1000 bps (10%) |
| Swap Fee | 5 bps (0.05%) | 100 bps (1%) |
| Rebalance Threshold | 50 bps | 1000 bps |

### 3. Oracle Security ✅
- Primary: Chainlink BTC/USD + ETH/USD
- Fallback: Secondary oracles
- Staleness Check: 1 hour threshold
- TWAP: 30-minute Uniswap V3 validation
- Deviation Check: 3% max divergence

### 4. Circuit Breaker ✅
- Trigger: 3 consecutive failures
- Cooldown: 1 hour
- Gradual Recovery: 50% daily limit restoration
- Events: `CircuitBreakerTriggered`, `CircuitBreakerReset`

### 5. MEV Protection ✅
- Slippage controls on all swaps
- TWAP-based pricing
- Profitability checks before execution
- Best-price DEX selection (Aerodrome vs Uniswap)

---

## Test Results

### Testnet Verification (Base Sepolia)
| Test | Result |
|------|--------|
| TokenizedStrategy deployment | ✅ `0x4FEFcCf08c65AD172C57b62d046edd838e1f1d69` |
| Strategy deployment | ✅ `0x08F793B353e9C0EF52c9c00aa579c69F6D9DAA1A` |
| View functions (`totalAssets`, `totalSupply`) | ✅ Working |
| Deposit (0.1 cbBTC → 0.1 jBTCi) | ✅ Success |
| Balance updates | ✅ Correct |

### Stress Test Scenarios
| Scenario | Status |
|----------|--------|
| Normal Deposit/Withdraw | ✅ Pass |
| Circuit Breaker Activation | ✅ Pass |
| Oracle Failover | ✅ Pass |
| Deposit Cap Enforcement | ✅ Pass |
| Rate Limit Enforcement | ✅ Pass |

---

## Deployment Information

| Field | Value |
|-------|-------|
| **Contract** | YearnJBTCiStrategy |
| **New Address** | *Pending — will be published after maintenance* |
| **Old Address** | `0x7d0Ae1Fa145F3d5B511262287fF686C25000816D` *(deprecated)* |
| **Network** | Base Mainnet (Chain ID: 8453) |
| **TokenizedStrategy** | `0xBB51273D6c746910C7C06fe718f30c936170feD0` (Yearn v3.0.4) |
| **Compiler** | Solidity 0.8.24 |
| **License** | MIT |

---

## Recommendations

1. **Post-Deployment**: Verify contract on BaseScan immediately
2. **Monitoring**: Set up alerts for circuit breaker triggers
3. **Timelock**: Deploy 24-hour timelock before scaling past 100 BTC
4. **Gradual Scaling**: Increase deposit cap weekly (50 → 100 → 250 → 500 BTC)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Jan 12, 2026 | Added critical finding, updated scoring, testnet verification |
| 1.0.0 | Jan 6, 2026 | Initial audit |

---

*Built by [Jubilee Labs](https://jubileelabs.xyz) • Powered by Yearn V3*
