# Lakomi Deployment Info

## DChain Mainnet (Chain ID: 17845)

**RPC**: `https://mainnet.dchain.id`  
**Explorer**: `https://explorer.dchain.id`  
**Deployer**: `0x66534dD42A65a2386aA9cB9c36d37A35c01C77b6`

| Contract | Address |
|---|---|
| MockIDRX | `0xC05A8D92702253C5db45762399D39dCc3c2cB525` |
| LakomiToken | `0xa23E3E4BfEAfC485Bb26021609F2CB4a0FbCF0a1` |
| LakomiVault | `0x2f72d86fbA46A418EA83a9986d62EBEEA8CE284D` |
| LakomiGovern | `0xC9c16965a9B010785Dc8B0A7a46D2e6B00948C80` |
| LakomiLoans | `0x48eC878AD39722d76cFD6393d2d2dcc0Eab9A8b3` |

## Anvil Local (Chain ID: 313377)

**RPC**: `http://localhost:8545`

| Contract | Address |
|---|---|
| MockIDRX | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| LakomiToken | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| LakomiVault | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| LakomiGovern | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| LakomiLoans | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |

## Deploy Commands

```bash
# Local (Anvil)
docker compose up -d

# DChain Mainnet
cd hardhat
DCHAIN_PK=0x... npx hardhat run scripts/deploy.js --network dchain
```

## Frontend

```bash
# DChain
VITE_CHAIN_ID=17845 VITE_CHAIN_NAME="DChain Mainnet" npm run build

# Anvil (default)
VITE_CHAIN_ID=313377 VITE_CHAIN_NAME="Anvil Lokal" npm run build
```
