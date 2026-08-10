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
| **Anonymous Identity** | [Semaphore v4](https://semaphore.pse.dev) — ZK group membership proofs |
| **Quantum-Safe Vault** | [Kohaku](https://github.com/ethereum/kohaku) `@kohaku-eth/pq-account` — Post-Quantum ERC-4337 |
| **Smart Contracts** | Solidity 0.8.23 + Hardhat + OpenZeppelin |
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS |
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

*Fill in after deployment:*

| Contract | Address |
|---|---|
| Semaphore v4 (pre-deployed) | `0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D` |
| CourseRegistry | TBD |
| CredentialIssuer | TBD |
| CredentialVerifier | TBD |

---

## Prize Tracks

- 🏆 **Best Use of Semaphore** — entire credential flow runs on Semaphore v4 ZK proofs
- 🏆 **Best Use of Kohaku** — PQ account as quantum-safe identity vault
- 🏆 **Privacy Innovation** — selective disclosure of academic credentials

---

## Team

Built at IIT Guwahati for the Ethereum Foundation "Road to Devcon" Academic Program.

---

## Future Improvements

While SecureHire currently uses a single ZK proof per course, the architecture can be extended for advanced selective disclosure and "Degree Proofs":

1. **Multi-Proof Bundles (Selective Disclosure)**: Allow students to select multiple courses from their transcript (e.g., CS201, MATH301) and generate a proof for each. A new `verifyBatch()` contract function would loop through and verify the entire bundle in a single transaction, granting employers granular verification while costing only a single transaction gas fee.
2. **Atomic Degree Groups**: Universities could create a special Semaphore group (e.g., "BTech CS 2026") and issue a credential once a student completes all prerequisites. This enables a student to prove they hold a full degree using a single, efficient ZK proof, eliminating the need to prove every individual course.
