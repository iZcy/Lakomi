require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: parseInt(process.env.CHAIN_ID) || 313377,
    },
    localhost: {
      url: process.env.RPC_URL || "http://127.0.0.1:8545",
    },
    dchainTestnet: {
      url: "https://dchaintestnet-2713017997578000-1.jsonrpc.testnet.sagarpc.io",
      chainId: 2713017997578000,
      accounts: process.env.DCHAIN_PK ? [process.env.DCHAIN_PK] : [],
    },
    dchain: {
      url: process.env.DCHAIN_RPC_URL || "https://mainnet.dchain.id",
      chainId: 17845,
      accounts: process.env.DCHAIN_PK ? [process.env.DCHAIN_PK] : [],
    },
  },
};
