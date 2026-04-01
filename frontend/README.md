# Lakomi Cooperative Frontend

A modern Vite + React + TypeScript frontend for the Lakomi blockchain cooperative system.

## Features

- **1-Member-1-Vote Governance**: Every member has equal voting power
- **Contribution Tiers**: Tier 1 (0-499 USDC), Tier 2 (500-1999 USDC), Tier 3 (2000+ USDC)
- **Tiered LTV**: 30%, 50%, 70% loan-to-value ratios based on contribution tier
- **Real-time Updates**: Using wagmi v2 with React Query
- **Modern UI**: Built with TailwindCSS and shadcn/ui components
- **Wallet Connection**: RainbowKit integration

## Architecture

### Smart Contracts (Deployed on Anvil Local)

- **LakomiToken**: `0xBB361f732DF9d30aB796136322ea75E69F3b94cE`
  - Membership registry
  - Voting power tracking (1 per member)
  - Token management

- **LakomiVault**: `0xE0D504963329D3F98888bd3b2fda4b68823492EB`
  - USDC deposits and withdrawals
  - Contribution tier calculation
  - Liquidity management

- **LakomiGovern**: `0x2A10e5a1Eb9c1f43E20992071e3CF2d8137bbceF`
  - Proposal creation and voting
  - 1-member-1-vote system
  - Quorum and timelock management

- **LakomiLoans**: `0x3ca10f66acE0d4aa0F427981e7697504db15300c`
  - Collateralized loans
  - Tiered LTV ratios
  - Loan approval and liquidation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Anvil local chain running at http://127.0.0.1:8545

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Configuration

Update the contract addresses in `/src/config/contracts.ts` if needed:

```typescript
export const CONTRACTS = {
  LAKOMI_TOKEN: '0xBB361f732DF9d30aB796136322ea75E69F3b94cE',
  LAKOMI_VAULT: '0xE0D504963329D3F98888bd3b2fda4b68823492EB',
  LAKOMI_GOVERN: '0x2A10e5a1Eb9c1f43E20992071e3CF2d8137bbceF',
  LAKOMI_LOANS: '0x3ca10f66acE0d4aa0F427981e7697504db15300c',
  MOCK_USDC: '0x1E13bAB730dF1e805e7a7dbA848EB227D95c8517',
}
```

## Project Structure

```
src/
├── abis/              # Contract ABIs
├── components/        # React components
│   ├── ui/           # Reusable UI components
│   ├── Dashboard.tsx
│   ├── Governance.tsx
│   ├── Vault.tsx
│   ├── Loans.tsx
│   ├── Navbar.tsx
│   └── MemberRegistration.tsx
├── config/           # Configuration files
├── hooks/            # Custom React hooks
│   ├── useContractRead.ts
│   └── useContractWrite.ts
├── lib/              # Utility functions
├── types/            # TypeScript types
├── wagmi.ts          # Wagmi configuration
├── App.tsx           # Main app component
└── main.tsx          # Entry point
```

## Key Design Decisions

### 1-Member-1-Vote System

The frontend emphasizes that **contribution builds reputation, not power**. This is reflected in:

- Voting power always shows "1" for members
- Contribution tier is prominently displayed
- LTV ratios are tier-based, not token-based
- Governance info card explains the democratic philosophy

### Contribution Tiers

The UI clearly shows:
- Tier 1: 0-499 USDC → 30% LTV
- Tier 2: 500-1999 USDC → 50% LTV
- Tier 3: 2000+ USDC → 70% LTV

### Member Registration

A dedicated `MemberRegistration` component is shown to non-members across all pages, encouraging registration.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 8
- **Styling**: TailwindCSS 4
- **Web3**: wagmi v3, viem v2, RainbowKit v2
- **State Management**: TanStack Query v5
- **Icons**: lucide-react
- **Utilities**: clsx, tailwind-merge

## Development

### Running Locally

1. Start Anvil:
```bash
anvil
```

2. Deploy contracts (if not already deployed):
```bash
# From the contracts directory
forge script script/Deploy.s.s --broadcast -vvvv
```

3. Start the frontend:
```bash
npm run dev
```

4. Open http://localhost:5173

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

MIT
