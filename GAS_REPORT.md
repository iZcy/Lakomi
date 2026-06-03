# Lakomi Gas Report

Measured on **DChain Mainnet** (chain 17845) and **Anvil Local** (chain 313377).

## Operations

| Operation | Anvil Gas | DChain Gas | DKT Cost |
|---|---|---|---|
| `approve` (IDRX) | 45,969 | 45,969 | <0.0001 |
| `registerMember` | 127,544 | 93,344 | <0.0002 |
| `paySimpananPokok` | 153,176 | 127,526 | <0.0003 |
| `deposit` (sukarela) | 110,337 | 93,379 | <0.0002 |
| `paySimpananWajib` | 152,534 | 135,434 | <0.0003 |
| `requestLoan` | 222,897 | 245,599 | <0.0005 |
| `approveLoan` | 54,431 | 54,443 | <0.0001 |
| `disburse` | ~200,000* | 174,499 | <0.0004 |
| `repayInFull` | ~150,000* | ~150,000* | <0.0003 |
| `createProposal` | 177,313 | 160,213 | <0.0003 |
| `castVote` | 110,216 | 110,228 | <0.0002 |
| `distributeSHU` | ~200,000* | ~200,000* | <0.0004 |
| `mint` (LAK/IDRX) | 51,012 | 51,012 | <0.0001 |
| `grantRole` | 51,360 | — | <0.0001 |

\* Estimated — not directly measured on this run.

## DKT Cost Calculation

DChain gas price: **0.000000002 DKT/gas** (2 nano-DKT).

All operations cost **<0.001 DKT** (~free). Even the most expensive operation (`requestLoan` at 245K gas) costs only 0.0005 DKT.

## Full Loan Cycle Cost

`requestLoan + approveLoan + disburse + repayInFull` ≈ 620,000 gas ≈ **0.001 DKT**.

## Sources

- Anvil: `REPORT_GAS=true npx hardhat test test/GasMeasurement.test.js`
- DChain: `node scripts/dchain-gas.mjs`
