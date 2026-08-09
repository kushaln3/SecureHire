# Agent 1 — Smart Contract Developer
## Context File for Session Hand-off

**Scope:** `packages/contracts/`  
**Status:** 🔄 RUNNING (conversation `7392ff18-9969-4daf-9561-298c29fc7dfd`)  
**Framework:** Hardhat + TypeScript  
**Package manager:** pnpm

---

## What This Agent Was Asked To Build

A complete Hardhat project with 3 Solidity contracts, tests, and a deploy script.

---

## Files To Create (target structure)

```
packages/contracts/
├── contracts/
│   ├── CourseRegistry.sol
│   ├── CredentialIssuer.sol
│   └── CredentialVerifier.sol
├── scripts/
│   └── deploy.ts
├── test/
│   └── credential.test.ts
├── deployments/
│   └── sepolia.json              ← created after `pnpm deploy:sepolia`
├── hardhat.config.ts
├── package.json
└── tsconfig.json
```

---

## Contract Specifications

### `CourseRegistry.sol`
```solidity
// SPDX-License-Identifier: MIT
// pragma solidity ^0.8.23

struct Course {
  string name;
  string code;
  uint256 groupId;
  address university;
  bool active;
}

// State:
mapping(uint256 => Course) public courses
mapping(string => uint256) public courseCodeToGroupId
uint256[] public allGroupIds
uint256 public courseCount
address public issuer   // only CredentialIssuer can call addCourse

// Modifier: onlyIssuer

// Functions:
// constructor(address _issuer)
// addCourse(string name, string code, uint256 groupId, address university) external onlyIssuer
// getCourse(uint256 groupId) external view returns (Course memory)
// getAllGroupIds() external view returns (uint256[] memory)
// isValidCourse(uint256 groupId) external view returns (bool)
// setIssuer(address _issuer) external onlyOwner    // in case we need to update
```

### `CredentialIssuer.sol`
```solidity
// SPDX-License-Identifier: MIT
// pragma solidity ^0.8.23
// Inherits: OpenZeppelin AccessControl

// IMPORTANT: Uses ISemaphore from @semaphore-protocol/contracts
// Semaphore address on Sepolia: 0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D

bytes32 constant UNIVERSITY_ROLE = keccak256("UNIVERSITY_ROLE");

struct UniversityInfo {
  string name;
  string metadata;
  bool approved;
  uint256 registeredAt;
}

// State:
ISemaphore public semaphore
ICourseRegistry public courseRegistry
mapping(address => UniversityInfo) public universities
mapping(uint256 => uint256) public credentialCount   // groupId => count

// Events:
// RegistrationRequested(address indexed wallet, string name, string metadata)
// UniversityApproved(address indexed wallet, string name)
// CourseCreated(uint256 indexed groupId, string name, string code, address indexed university)
// CredentialIssued(uint256 indexed groupId, uint256 indexed commitment, uint256 timestamp)
// CredentialRevoked(uint256 indexed groupId, uint256 indexed commitment)

// Constructor: (address semaphoreAddress, address courseRegistryAddress)

// Functions:
// requestRegistration(string calldata name, string calldata metadata) external
// approveUniversity(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE)
// createCourse(string calldata name, string calldata code) external onlyRole(UNIVERSITY_ROLE) returns (uint256 groupId)
//   → calls semaphore.createGroup() → gets groupId
//   → calls courseRegistry.addCourse(name, code, groupId, msg.sender)
//   → emits CourseCreated
// issueCredential(uint256 groupId, uint256 commitment) external onlyRole(UNIVERSITY_ROLE)
//   → calls semaphore.addMember(groupId, commitment)
//   → increments credentialCount[groupId]
//   → emits CredentialIssued
// revokeCredential(uint256 groupId, uint256 commitment) external onlyRole(UNIVERSITY_ROLE)
//   → calls semaphore.removeMember(...)
//   → emits CredentialRevoked
// getUniversity(address wallet) external view returns (UniversityInfo memory)
// isUniversity(address wallet) external view returns (bool)
//   → returns hasRole(UNIVERSITY_ROLE, wallet)
```

### `CredentialVerifier.sol`
```solidity
// SPDX-License-Identifier: MIT
// pragma solidity ^0.8.23
// Uses ISemaphore from @semaphore-protocol/contracts

// State:
ISemaphore public semaphore
ICourseRegistry public courseRegistry
mapping(uint256 => bool) public usedNullifiers

// Events:
// CredentialVerified(uint256 indexed groupId, uint256 indexed nullifier, uint256 message, bool valid)

// Constructor: (address semaphoreAddress, address courseRegistryAddress)

// Functions:
// verifyCredential(ISemaphore.SemaphoreProof calldata proof, uint256 groupId) external returns (bool)
//   → require(courseRegistry.isValidCourse(groupId), "Invalid course")
//   → require(!usedNullifiers[proof.nullifier], "Proof already used")
//   → semaphore.validateProof(groupId, proof)  ← this reverts if invalid
//   → usedNullifiers[proof.nullifier] = true
//   → emit CredentialVerified(groupId, proof.nullifier, proof.message, true)
//   → return true
// isNullifierUsed(uint256 nullifier) external view returns (bool)
```

---

## `hardhat.config.ts`

```typescript
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@semaphore-protocol/hardhat';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

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
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY || '' },
};
export default config;
```

---

## `deploy.ts`

Deploy order: CourseRegistry → CredentialIssuer → CredentialVerifier  
After deploy: call `courseRegistry.setIssuer(credentialIssuer.address)`  
Save to `deployments/sepolia.json`:
```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "semaphoreAddress": "0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D",
  "courseRegistry": { "address": "0x...", "blockNumber": 123456 },
  "credentialIssuer": { "address": "0x...", "blockNumber": 123456 },
  "credentialVerifier": { "address": "0x...", "blockNumber": 123456 }
}
```
Also copy this file to `../../apps/web/src/lib/deployments.json`.

---

## `credential.test.ts` — Test Flow

```
1. Deploy all 3 contracts on local Hardhat network
2. [signer1] requestRegistration("IIT Guwahati", "Finance Dept")
3. [admin] approveUniversity(signer1.address)
4. [signer1] createCourse("DSAI Minor", "DSAI001") → returns groupId
5. const identity = new Identity()
6. [signer1] issueCredential(groupId, identity.commitment)
7. Reconstruct group off-chain, addMember(identity.commitment)
8. const proof = await generateProof(identity, group, BigInt(1), BigInt(groupId))
9. [anyone] credentialVerifier.verifyCredential(proof, groupId) → true
10. Assert CredentialVerified event
11. Assert second call with same nullifier reverts ("Proof already used")
```

---

## Package.json Scripts

```json
{
  "name": "@eternity-id/contracts",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy:local": "hardhat run scripts/deploy.ts --network hardhat",
    "deploy:sepolia": "hardhat run scripts/deploy.ts --network sepolia",
    "verify": "hardhat verify"
  }
}
```

---

## Install Commands (run from `packages/contracts/`)

```bash
pnpm init -y
pnpm add --save-dev hardhat @nomicfoundation/hardhat-toolbox @semaphore-protocol/hardhat typescript ts-node @types/node dotenv
pnpm add @semaphore-protocol/contracts @semaphore-protocol/identity @semaphore-protocol/group @semaphore-protocol/proof @openzeppelin/contracts
```

---

## If Starting Fresh / Resuming

1. Check if files exist: `ls packages/contracts/contracts/`
2. If contracts exist, run `pnpm compile` from `packages/contracts/`
3. If compile passes, run `pnpm test`
4. If tests pass, deploy: `pnpm deploy:sepolia` (needs `.env` with SEPOLIA_RPC_URL + PRIVATE_KEY)
5. Save addresses to `packages/contracts/deployments/sepolia.json`
6. Copy addresses to `apps/web/src/lib/deployments.json`

---

## Deliverables Checklist

- [ ] `CourseRegistry.sol` compiles
- [ ] `CredentialIssuer.sol` compiles
- [ ] `CredentialVerifier.sol` compiles
- [ ] `pnpm test` passes (all 11 assertions)
- [ ] `deployments/sepolia.json` exists with real addresses
- [ ] ABI files available in `artifacts/`
