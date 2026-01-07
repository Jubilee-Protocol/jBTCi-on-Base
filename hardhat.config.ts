import { HardhatUserConfig } from "hardhat/config";
import "dotenv/config";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-deploy";
import "@nomicfoundation/hardhat-verify";
import "hardhat-preprocessor";
import * as fs from "fs";

function getRemappings() {
  return fs
    .readFileSync("remappings.txt", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line: string) => line.trim().split("="));
}
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1, // Minimize bytecode size
      },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  zksolc: {
    version: "1.4.0",
    settings: {
      optimizer: {
        enabled: true,
        mode: "z",
      },
    },
  },
  networks: {
    zksyncSepolia: {
      url: process.env.QUICKNODE_RPC_URL_ZKSYNC_SEPOLIA || "",
      ethNetwork: "sepolia",
      zksync: true,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    zksyncMainnet: {
      url: process.env.QUICKNODE_RPC_URL_ZKSYNC_MAINNET || "",
      ethNetwork: "mainnet",
      zksync: true,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      zksync: false,
    },
    base: {
      url: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      zksync: false,
    },
  },
  paths: {
    artifacts: "./artifacts-zk",
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
  },
  preprocess: {
    eachLine: () => ({
      transform: (line: string) => {
        if (line.match(/^\s*import /i)) {
          for (const [find, replace] of getRemappings()) {
            if (line.includes(find)) {
              line = line.replace(find, replace);
            }
          }
        }
        return line;
      },
    }),
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
};
export default config;
