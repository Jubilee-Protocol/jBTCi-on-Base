# jBTCi Smart Contract Security Audit Report
## YearnJBTCiStrategy - Post-Bug Fix Audit
**Date:** January 14, 2026  
**Auditor:** Antigravity AI  
**Contract Version:** Post-fix (v2)

---

## Executive Summary

This audit was conducted following the discovery of a **CRITICAL** double-counting bug in the `_calculateTotalHoldings()` function. The bug caused TVL and allocation percentages to be incorrectly reported.

### Overall Risk Assessment: **MEDIUM** (after fixes)

| Severity | Count |
|----------|-------|
| Critical | 0 (fixed) |
| High | 1 |
| Medium | 2 |
| Low | 3 |
| Informational | 2 |

---

## Critical Issues (Fixed)

### [C-01] Double-Counting of cbBTC in `_calculateTotalHoldings()` ✅ FIXED

**Location:** `contracts/YearnJBTCiStrategy.sol:1470-1475`

**Previous Code:**
```solidity
function _calculateTotalHoldings() internal view returns (uint256) {
    return
        WBTC.balanceOf(address(this)) +
        CBBTC.balanceOf(address(this)) +
        asset.balanceOf(address(this));
}
```

**Issue:** Since `asset == CBBTC`, this function double-counted cbBTC holdings.

**Impact:**
- TVL reported as 2x the actual value
- Allocation percentages reported incorrectly (50% instead of 100%)
- Could mislead users and affect share price calculations

**Fix Applied:**
```solidity
function _calculateTotalHoldings() internal view returns (uint256) {
    return WBTC.balanceOf(address(this)) + CBBTC.balanceOf(address(this));
}
```

### [C-02] Double-Counting in `getAllocationDetails()` ✅ FIXED

**Location:** `contracts/YearnJBTCiStrategy.sol:1663-1672`

**Issue:** Same double-counting bug in the `getAllocationDetails()` view function.

**Fix Applied:** Set `assetBalance = 0` and recalculate totalBalance without asset.

---

## High Severity Issues

### [H-01] No Test Suite Exists ⚠️ REQUIRES ACTION

**Description:** The project has no test files in the `/test` directory. This is a significant risk as bugs can go undetected.

**Recommendation:** 
1. Create comprehensive test suite covering:
   - Deposit/withdrawal flows
   - Allocation calculations
   - Edge cases (zero balance, overflow)
   - Access control
   - Oracle failure modes

**Status:** Test file created at `test/YearnJBTCiStrategy.test.js` (pending execution)

---

## Medium Severity Issues

### [M-01] Oracle Fallback Uses Same Address Check May Fail

**Location:** Line 496-497

```solidity
if (_btcUsdOracle == _fallbackBtcOracle) revert SameAddress();
if (_ethUsdOracle == _fallbackEthOracle) revert SameAddress();
```

**Issue:** While this is a safety check, it requires deployment of separate fallback oracle contracts even in testing. This increases deployment complexity.

**Recommendation:** Consider allowing same address with a boolean flag for test environments.

### [M-02] Hardcoded TokenizedStrategy Address

**Location:** `contracts/lib/tokenized-strategy/BaseStrategy.sol:102-103`

```solidity
address public constant tokenizedStrategyAddress =
    0x4FEFcCf08c65AD172C57b62d046edd838e1f1d69;
```

**Issue:** This requires manual update for each network deployment.

**Recommendation:** Use immutable variable set in constructor or use a factory pattern.

---

## Low Severity Issues

### [L-01] Unused Function Parameter Warning

**Location:** `contracts/mocks/MockRouter.sol:18`

**Issue:** `deadline` parameter is unused.

**Recommendation:** Add `/* deadline */` comment or remove parameter.

### [L-02] Missing Event Emission in Some State Changes

**Description:** Some parameter updates don't emit events for off-chain tracking.

**Recommendation:** Add events for all administrative functions.

### [L-03] Magic Numbers in Code

**Description:** Various hardcoded values (e.g., `10000` for BASIS_POINTS) could benefit from named constants with documentation.

---

## Informational

### [I-01] Consider Using OpenZeppelin's SafeCast

For conversions between int256 and uint256, consider using SafeCast for additional safety.

### [I-02] Documentation Could Be More Comprehensive

Recommend adding NatSpec comments to all public functions.

---

## Deployment Status

### Testnet (Base Sepolia)
- **Current Address:** `0x08F793B353e9C0EF52c9c00aa579c69F6D9DAA1A`
- **Status:** ⚠️ CONTAINS BUG (double-counting)
- **Action Required:** Redeploy with fixed contract

### Mainnet (Base)
- **Current Address:** `0x7d0Ae1Fa145F3d5B511262287fF686C25000816D`
- **Status:** ⚠️ CONTAINS BUG (double-counting)
- **Action Required:** Redeploy before accepting deposits

---

## Frontend Workaround

The frontend (`frontend/app/page.tsx`) has been updated with a temporary workaround:
1. Divides `totalHoldings` by 2 to correct the double-count
2. Normalizes allocation percentages to 100%

**This is a temporary fix until contracts are redeployed.**

---

## Recommendations Summary

1. **URGENT:** Redeploy fixed contracts on both testnet and mainnet
2. **HIGH:** Run full test suite before mainnet deployment
3. **MEDIUM:** Add proper mock infrastructure for testnet
4. **LOW:** Address code quality issues

---

## Files Changed in Fix

| File | Change |
|------|--------|
| `contracts/YearnJBTCiStrategy.sol` | Fixed `_calculateTotalHoldings()` and `getAllocationDetails()` |
| `frontend/app/page.tsx` | Added temporary frontend workaround |
| `test/YearnJBTCiStrategy.test.js` | Created (pending execution) |
| `deploy/QuickRedeploy_Testnet.js` | Created for quick redeployment |

---

## Audit Methodology

1. Manual code review of all smart contract functions
2. Static analysis with Hardhat warnings
3. Dynamic testing with custom scripts
4. Comparison of on-chain data vs expected values

---

## Disclaimer

This audit does not guarantee the absence of vulnerabilities. It represents a best-effort review within the time constraints. A professional third-party audit from firms like Trail of Bits, OpenZeppelin, or Consensys Diligence is recommended before mainnet launch.
