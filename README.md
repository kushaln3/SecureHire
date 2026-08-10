# Eternity-ID: ZK-Degree & Course Verifier

> **IITG.eth Hackathon 2026** — Building Private Apps using Ethereum  
> IIT Guwahati | August 9–10, 2026

A **zero-knowledge credential verification system** that lets students prove they passed specific university courses to employers — without revealing their identity, wallet address, or any other part of their academic transcript.

**Selective disclosure. Cryptographic proof. Quantum-safe.**

---

## How It Works

```
University                    Student                    Employer
    │                            │                          │
    │ 1. Register on-chain       │                          │
    │ 2. Create course group     │                          │
    │ 3. Issue credential ──────▶│                          │
    │    (add commitment         │ 4. Generate ZK Proof     │
    │     to Semaphore group)    │ 5. Send proof JSON ─────▶│
    │                            │                          │ 6. Verify on-chain
    │                            │                          │ ✅ Passed: DSAI Minor
    │                            │                          │ 🔒 Identity: Hidden
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Anonymous Identity** | [Semaphore v4](https://semaphore.pse.dev) — ZK group membership proofs (live on Sepolia) |
| **Quantum-Safe Vault** | [Kohaku](https://github.com/ethereum/kohaku) — PQ ERC-4337 account architecture |
| **Smart Contracts** | Solidity 0.8.23 + Hardhat + OpenZeppelin |
| **Frontend** | Next.js 15 (App Router) + Vanilla CSS |
| **Network** | Ethereum Sepolia Testnet |

---

## Project Structure

```
├── apps/
│   └── web/                # Next.js frontend — 4 portals
├── packages/
│   ├── contracts/          # Hardhat smart contracts
│   └── identity-vault/     # TypeScript library (Semaphore + Kohaku)
├── .env.example
├── package.json            # pnpm workspace root
└── pnpm-workspace.yaml
```

---

## Portals

| Portal | Route | For |
|---|---|---|
| Landing | `/` | Everyone — overview + stats |
| University | `/university` | Institutions — register, manage courses, issue credentials |
| Student | `/student` | Students — create ZK identity, view credentials, generate proofs |
| Employer | `/verify` | Employers — verify proofs cryptographically |

---

## Getting Started

### Prerequisites
- Node.js >= 18
- pnpm >= 8
- MetaMask browser extension
- A funded Sepolia testnet wallet

### Install
```bash
pnpm install
```

### Environment Setup
```bash
cp .env.example .env
# Fill in:
# SEPOLIA_RPC_URL=https://your-quicknode-endpoint/
# PRIVATE_KEY=your_wallet_private_key
# ETHERSCAN_API_KEY=optional
```

### Run Frontend (dev)
```bash
pnpm dev
```

### Compile Contracts
```bash
cd packages/contracts
pnpm compile
```

### Run Tests
```bash
cd packages/contracts
pnpm test
```

### Deploy to Sepolia
```bash
cd packages/contracts
pnpm deploy:sepolia
```
After deployment, copy the addresses from `packages/contracts/deployments/sepolia.json` into `apps/web/.env.local`.

---

## Deployed Contracts (Sepolia)

| Contract | Address |
|---|---|
| Semaphore v4 (pre-deployed) | `0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D` |
| CourseRegistry | `0x8895d0401384Dffd60E53df362D3f422e2A0bF23` |
| CredentialIssuer | `0x9499153dDf0bD0c8A6F173d0bD4cF0780183e85D` |
| CredentialVerifier | `0xAAe96283690450E6a869e2a44aAb4a04Cf453605` |

---

## Kohaku Integration Architecture

SecureHire is **architecturally designed** to integrate four Kohaku privacy primitives. Because several Kohaku packages (`pq-account`, Railgun wallet-side API) are still in active development and not yet available as public npm packages or require wallet-level mnemonic access, we have implemented these as architecture stubs that are drop-in replaceable once the Kohaku SDK is production-ready.

### 1. Post-Quantum Identity Vault (`@kohaku-eth/pq-account`)

Each student's Semaphore ZK identity is **designed to be rooted in a CRYSTALS-Dilithium (MLDSA) post-quantum key pair** rather than ECDSA.

```ts
// Designed integration (packages/identity-vault/src/pq-account.ts)
const account = await createPQAccount(); // Deploys ERC-4337 PKContract with 20kB Dilithium pubkey
const seed = keccak256(account.dilithiumPublicKey);
const identity = new Identity(seed); // Semaphore identity anchored to quantum-safe key
```

**Current stub:** 64-byte mock key is generated and used as the seed. The Identity Vault wrapper (`packages/identity-vault/`) is production-ready; only the key generator is mocked.

### 2. Shielded Credential Issuance (`@kohaku-eth/railgun`)

When a university issues credentials, the transaction is currently visible on Etherscan. The architecture calls for routing through Railgun so metadata (graduation counts, timing) is hidden.

```ts
// Designed integration (apps/web/src/app/university/dashboard/page.tsx)
const railgun = await createRailgunPlugin(host, {});
const shieldedTx = await railgun.prepareShield({ asset: 'eth', amount: 0n });
// Issue credential through Railgun relayer — metadata-private
```

**Current stub:** Direct MetaMask transaction to `CredentialIssuer.sol`. Blocked by: Railgun plugin requires BIP-32 mnemonic which MetaMask does not expose to dApps by design.

### 3. Shielded Employer Verification (`@kohaku-eth/railgun`)

Employers verifying a proof would pay a small fee privately so students cannot correlate which company verified their credentials.

```ts
// Designed integration (apps/web/src/app/verify/page.tsx)
const privateTx = await railgun.prepareUnshield(
  { asset: 'eth', amount: parseEther('0.01') },
  SECUREHIRE_TREASURY_ADDRESS
);
await railgun.broadcastPrivateOperation(privateTx);
```

**Current stub:** Verification is free; no fee mechanism implemented.

### 4. Privacy RPC Provider (`@kohaku-eth/provider`)

All blockchain reads route through Kohaku's provider interface, which is designed to work with Helios light clients to prevent IP-address correlation via Infura/Alchemy.

```ts
// Designed integration
import { ethers as kohakuEthers } from '@kohaku-eth/provider';
const provider = kohakuEthers(new ethers.BrowserProvider(window.ethereum));
```

**Current stub:** `ethers.BrowserProvider(window.ethereum)` used directly.

---

## Team

Built at IIT Guwahati for the Ethereum Foundation "Road to Devcon" Academic Program.

---

## Future Improvements

1. **Multi-Proof Bundles (Selective Disclosure)**: Students select multiple courses, generate a proof per course, and submit as a bundle. A new `verifyBatch()` contract function verifies all in one transaction.
2. **Atomic Degree Groups**: Universities create a special Semaphore group for a full degree. One proof covers the entire qualification.
3. **Full Kohaku Integration**: As `@kohaku-eth/pq-account` matures and Railgun gains a wallet-side dApp API, all four architecture stubs above become live integrations with zero changes to the application logic.
