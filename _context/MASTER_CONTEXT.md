# Eternity-ID: ZK-Degree & Course Verifier
## Master Context File — Hackathon Session Hand-off

**Last Updated:** 2026-08-10 01:25 IST  
**Hackathon:** IITG.eth — Building Private Apps using Ethereum (IIT Guwahati)  
**Deadline:** August 10, 2026 (TODAY)  
**Prize Tracks:** Best Use of Semaphore | Best Use of Kohaku | Privacy Innovation

---

## Project Location
```
c:\Users\naren\Desktop\Desktop\Programming\Eth_IITG\
```
This directory IS the git repo root. Initialize with `git init` if not done.

---

## What We Are Building

**Eternity-ID** — A ZK-based selective credential disclosure system.

- A university can issue on-chain credentials (e.g., "DSAI Minor passed") to students anonymously
- A student can prove to an employer they passed a specific course WITHOUT revealing their identity, wallet, or rest of transcript
- The employer gets a 100% cryptographic (not trusted-party) guarantee
- The student's identity is bound to a Post-Quantum ERC-4337 account (Kohaku)

**This is "selective disclosure"**: student chooses exactly which credential to show.

---

## All Decisions Locked In

| Decision | Choice |
|---|---|
| Network | Ethereum Sepolia testnet |
| Semaphore Contract | `0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D` (pre-deployed, do NOT redeploy) |
| Kohaku PQ Account | Option B — Mock wrapper with graceful fallback (see agent 2 context) |
| University Auth | Wallet-based — `UNIVERSITY_ROLE` on-chain via OpenZeppelin AccessControl |
| Selective Disclosure | One Semaphore Group per course |
| Frontend | Next.js 14+ App Router + Tailwind CSS |
| Package Manager | pnpm (workspace monorepo) |
| Smart Contract Framework | Hardhat + TypeScript |

---

## Monorepo Structure

```
Eth_IITG/                               ← GIT REPO ROOT
├── _context/                           ← Hand-off context files (this dir)
│   ├── MASTER_CONTEXT.md               ← This file
│   ├── agent_1_contracts.md
│   ├── agent_2_identity_vault.md
│   ├── agent_3_frontend.md
│   └── agent_4_integration.md
├── apps/
│   └── web/                            ← Next.js frontend (Agent 3)
├── packages/
│   ├── contracts/                      ← Hardhat smart contracts (Agent 1)
│   └── identity-vault/                 ← Semaphore + Kohaku TS library (Agent 2)
├── .env.example                        ← ✅ CREATED
├── .env                                ← USER MUST CREATE from .env.example
├── .gitignore                          ← ✅ CREATED
├── package.json                        ← ✅ CREATED (workspace root)
├── pnpm-workspace.yaml                 ← ✅ CREATED
└── README.md
```

---

## Key Contract Addresses (Sepolia — Pre-Deployed by Semaphore Team)

| Contract | Address |
|---|---|
| `Semaphore` (main, use this) | `0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D` |
| `SemaphoreVerifier` | `0x4DeC9E3784EcC1eE002001BfE91deEf4A48931f8` |
| `PoseidonT3` | `0xB43122Ecb241DD50062641f089876679fd06599a` |

**Our contracts** (deployed by us, addresses saved to `packages/contracts/deployments/sepolia.json` after deployment):
- `CourseRegistry` — TBD after deploy
- `CredentialIssuer` — TBD after deploy
- `CredentialVerifier` — TBD after deploy

---

## NPM Packages Reference

### Semaphore v4
```bash
@semaphore-protocol/identity   # Identity creation, export, import
@semaphore-protocol/group      # Off-chain Merkle group management
@semaphore-protocol/proof      # ZK proof generation + verification
@semaphore-protocol/data       # Query on-chain Semaphore groups
@semaphore-protocol/contracts  # Solidity contracts + ISemaphore interface
@semaphore-protocol/hardhat    # Hardhat plugin
```

### Kohaku (alpha — install may fail, use mock wrapper)
```bash
@kohaku-eth/pq-account         # Post-Quantum ERC-4337 account (EXPERIMENTAL)
@kohaku-eth/provider           # Provider abstraction
```

### Key Semaphore API (v4)
```typescript
// Identity
const identity = new Identity();          // random
const identity = new Identity(seed);      // deterministic from seed
identity.commitment                       // bigint — safe to put on-chain
identity.export()                         // string — store in localStorage
Identity.import(str)                      // restore from string

// Group
const group = new Group();
group.addMember(commitment);              // bigint
group.addMembers([...]);

// Proof generation
const proof = await generateProof(identity, group, message, scope);
// proof shape: { merkleTreeDepth, merkleTreeRoot, nullifier, message, scope, points }

// Proof verification (off-chain)
await verifyProof(proof);                 // boolean
```

---

## System Flow

```
1. University connects wallet → registers on-chain (requestRegistration)
2. We (deployer) grant UNIVERSITY_ROLE to university wallet (approveUniversity)
3. University creates a course → Semaphore group created → registered in CourseRegistry
4. Student creates Semaphore identity in browser (secret NEVER leaves device)
5. Student shares their commitment (public) with university
6. University calls issueCredential(groupId, commitment) → student added to group
7. Student generates ZK proof for a specific course + job application ID
8. Student sends proof JSON to employer
9. Employer submits proof to CredentialVerifier.sol → validated on-chain
10. Employer sees "✅ Passed DSAI Minor" + "🔒 Identity hidden"
```

---

## Agent Status (as of session start)

| Agent | Status | Conversation ID |
|---|---|---|
| 🔵 Agent 1 — Smart Contracts | 🔄 RUNNING | `7392ff18-9969-4daf-9561-298c29fc7dfd` |
| 🟢 Agent 2 — Identity Vault | 🔄 RUNNING | `989385fd-fe72-47e2-8be6-f42aa9cc685e` |
| 🟠 Agent 3 — Frontend | 🔄 RUNNING | `349ea4fd-5b40-4f06-a03c-88bace18b31b` |
| 🔴 Agent 4 — Integration | ⏳ NOT STARTED (waits for 1+2+3) | — |

---

## Environment Variables Required

Create `.env` in the repo root (copy from `.env.example`):
```bash
SEPOLIA_RPC_URL=https://your-endpoint.quiknode.pro/YOUR_API_KEY/
PRIVATE_KEY=your_deployer_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key

NEXT_PUBLIC_SEPOLIA_RPC_URL=https://your-endpoint.quiknode.pro/YOUR_API_KEY/
NEXT_PUBLIC_SEMAPHORE_ADDRESS=0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D
NEXT_PUBLIC_COURSE_REGISTRY_ADDRESS=      # Fill after deployment
NEXT_PUBLIC_CREDENTIAL_ISSUER_ADDRESS=    # Fill after deployment
NEXT_PUBLIC_CREDENTIAL_VERIFIER_ADDRESS=  # Fill after deployment
```

---

## What Needs to Happen Next (for new session)

1. Check if agents completed (look in `packages/contracts/`, `packages/identity-vault/`, `apps/web/`)
2. Run `pnpm compile` in `packages/contracts/` — fix any errors
3. Run `pnpm test` in `packages/contracts/` — fix any errors
4. Fill `.env` with QuickNode Sepolia RPC + private key
5. Run `pnpm deploy:sepolia` in `packages/contracts/`
6. Copy deployed addresses into `.env` (NEXT_PUBLIC_*) and `apps/web/.env.local`
7. Wire addresses into `apps/web/src/lib/contracts.ts`
8. Run `pnpm dev` in `apps/web/` — test full flow
9. Do end-to-end demo run: register university → create course → issue credential → generate proof → verify
