import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@semaphore-protocol/hardhat';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const rawPrivateKey = process.env.PRIVATE_KEY || '';
const isValidPrivateKey = /^(0x)?[0-9a-fA-F]{64}$/.test(rawPrivateKey);
const privateKeys = isValidPrivateKey ? [rawPrivateKey] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.23',
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    hardhat: {},
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL || '',
      accounts: privateKeys,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
};
export default config;
