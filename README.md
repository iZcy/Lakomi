# Lakomi — Blockchain Cooperative System

**UU No. 25 Tahun 1992 Compliant Cooperative on Blockchain**

A decentralized cooperative (koperasi) platform implementing all 26 pasals of Indonesian Cooperative Law (UU 25/1992) as smart contracts on Ethereum-compatible blockchains.

## What It Does

- **Member Registration** — KYC + simpanan pokok via MetaMask wallet
- **Simpanan** — Pokok (mandatory), Wajib (monthly), Sukarela (voluntary deposits)
- **Pinjaman** — Collateralized loans with 5% APY, multi-tier LTV, Pengurus approval
- **Governance** — 1-member-1-vote, proposals, quorum 67%, on-chain execution
- **Elections** — On-chain voting for Pengurus/Bendahara/Pengawas with term tracking
- **SHU Distribution** — 6-category split (cadangan, jasa modal, jasa usaha, pendidikan, pengurus, kesejahteraan)
- **Pengawas Audit** — Real-time financial snapshot
- **Voluntary Exit** — simpanan pokok refund, LAK burned

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.20, Hardhat, OpenZeppelin |
| Frontend | React + Vite + TypeScript, Wagmi, TailwindCSS |
| Testing | Hardhat, Anvil RPC impersonation, Shell scripts |
| Target Chains | Anvil (local), DChain Testnet |

## Quick Start

```bash
# Start local dev environment
docker compose up -d

# Frontend at http://localhost:5173
# Anvil RPC at http://localhost:8545
```

## Deploy to DChain Testnet

```bash
cd hardhat
DCHAIN_PK=0x... npx hardhat run scripts/deploy.js --network dchainTestnet
```

Then set frontend env vars:
```
VITE_CHAIN_ID=2713017997578000
VITE_CHAIN_NAME=DChain Testnet
```

## Automated Testing

```bash
# Full 22-case E2E test (no MetaMask required)
bash tests/run-all-tests.sh
```

See `tests/TEST_ROADMAP.md` for complete test plan with accounts.

## Contracts

| Contract | Purpose |
|---|---|
| `LakomiToken.sol` | ERC-20 governance token, membership registry, locking |
| `LakomiVault.sol` | Simpanan management, SHU distribution, treasury |
| `LakomiGovern.sol` | Proposals, voting, quorum, elections, veto |
| `LakomiLoans.sol` | Loan lifecycle, approval, repayment, default |
| `MockUSDC.sol` | Test USDC stablecoin |

## Regulation Compliance

26 of 26 implementable pasals from UU 25/1992 mapped to smart contracts. See `frontend/src/components/Compliance.tsx` for the full audit.

## Project Structure

```
├── src/                  # Solidity contracts
├── frontend/             # React + Vite frontend
├── hardhat/              # Hardhat config + deploy scripts
├── tests/                # Automated test scripts + roadmap
├── docs/                 # Papers, compliance map, latex templates
└── docker-compose.yml    # Local dev: Anvil + Deployer + Frontend
```
