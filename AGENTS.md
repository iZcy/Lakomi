# Lakomi — Blockchain Cooperative System

Full-stack Web3 dApp implementing Indonesian Cooperative Law (UU No. 25 Tahun 1992) on blockchain.

## Context Guardrails (READ FIRST)

### Exploration rules
- **Do NOT do broad exploration.** If you don't know where something lives, ask or use targeted glob/grep. Never scan entire directories recursively without a specific pattern.
- **When searching, use specific patterns.** e.g. `**/Govern*.sol` not `src/*`. e.g. grep for `function propose` not just `propose`.
- **Read only what you need.** Don't read entire files if grep pinpoints the relevant lines. Use `head`/`tail` or offset for large files.
- **One subagent at a time.** Don't spawn parallel explore agents on the same question.
- **Prefer edit over write.** Use the edit tool (not write) for existing files to avoid re-reading.

### Scope-aware prefixes
- **Solidity contracts** → `src/` (Foundry source), mirrored in `hardhat/contracts/`
- **Foundry tests** → `test/`
- **Hardhat deploy/tests** → `hardhat/test/`, `hardhat/scripts/`
- **Frontend React** → `frontend/src/`
- **E2E tests** → `tests/`
- **Docs/thesis** → `docs/`

---

## Project Map

```
├── src/                    # Solidity smart contracts (Foundry)
│   ├── LakomiToken.sol     # ERC-20 governance token, membership, locking
│   ├── LakomiVault.sol     # Deposits (simpanan), SHU distribution, treasury
│   ├── LakomiGovern.sol    # Proposals, voting (67% quorum), elections, veto
│   ├── LakomiLoans.sol     # Loan lifecycle, approval, repayment, collateral
│   └── mocks/              # Mock contracts (MockIDRX.sol)
├── test/                   # Foundry unit tests (.t.sol)
├── script/                 # Foundry deploy scripts (.s.sol)
├── hardhat/                # Hardhat project (deploy scripts, tests, contract mirrors)
│   ├── contracts/          # Mirrored Solidity (same contracts as src/)
│   ├── scripts/            # Hardhat deploy scripts
│   └── test/               # Hardhat tests
├── frontend/               # React 19 + Vite 8 + TypeScript
│   └── src/
│       ├── abis/           # Contract ABIs
│       ├── components/     # React components (shadcn/ui based)
│       ├── config/         # App config
│       ├── hooks/          # Custom React hooks (wagmi)
│       ├── lib/            # Utility functions
│       ├── types/          # TypeScript type definitions
│       ├── wagmi.ts        # Wagmi client configuration
│       └── wagmi/          # Wagmi generated code
├── tests/                  # Playwright E2E tests
├── docs/                   # Thesis papers, LaTeX, diagrams, literature
├── lib/                    # Foundry dependencies (OpenZeppelin, etc.)
├── broadcast/              # Foundry deployment artifacts
├── .playwright-mcp/        # Playwright MCP snapshots (~119 files)
├── example/                # Peer projects (reference only, do not modify)
├── logs/                   # Application logs
├── downloads/              # Downloaded files
├── scripts/                # Shell deploy scripts
├── docker-compose.yml      # Anvil + Hardhat Deployer + Frontend (nginx)
├── foundry.toml            # Solidity 0.8.20, optimizer via-ir, 200 runs
├── contract-addresses.json # Deployed contract addresses
└── library.db              # SQLite database (gitignored)
```

## Common Commands

### Smart contracts
```bash
forge build                          # Compile contracts
forge test                           # Run Foundry tests
forge test --match-test testXxx -vvv # Run specific test with traces
forge script script/Deploy.s.sol --rpc-url localhost --broadcast
```

### Frontend
```bash
cd frontend && npm run dev     # Start dev server
cd frontend && npm run build   # Production build (typecheck + vite)
cd frontend && npm run lint    # ESLint
```

### Docker
```bash
docker compose up --build      # Full local stack (Anvil + Deployer + Frontend)
```

### E2E tests
```bash
npx playwright test --project e2e
```

## Key Conventions

- **Solidity version**: 0.8.20, via-IR optimizer, 200 runs
- **Frontend stack**: React 19, Vite 8, Wagmi 3, RainbowKit 2, TailwindCSS 3, shadcn/ui
- **Contracts live in `src/`** (Foundry canonical). `hardhat/contracts/` is a mirror for Hardhat deploy scripts.
- **Two frameworks**: Foundry for compilation/tests, Hardhat for deployment scripts and some tests.
- **Path aliases**: Frontend uses `@/` for `frontend/src/`
- **No strict TypeScript**: `strict: false` in frontend tsconfig

## Do Not Touch

- `example/` — Peer reference projects, read-only
- `broadcast/` — Generated deployment artifacts
- `.playwright-mcp/` — Auto-generated snapshots
- `lib/` — Foundry git submodule dependencies
