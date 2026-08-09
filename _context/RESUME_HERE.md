# HOW TO RESUME THIS SESSION
## Instructions for a new AI session picking up this project

**READ THIS FILE FIRST if starting a new AI session.**

---

## Step 1: Read context files

Read these files IN ORDER:
1. `_context/MASTER_CONTEXT.md` — full project overview, decisions, architecture
2. Check which agents completed by looking at the directory structure

---

## Step 2: Check what exists

Run these checks:
```bash
# Check smart contracts
ls packages/contracts/contracts/
ls packages/contracts/deployments/

# Check identity vault
ls packages/identity-vault/src/

# Check frontend
ls apps/web/src/app/
```

---

## Step 3: Determine phase

| Scenario | Action |
|---|---|
| Contracts missing | Read `_context/agent_1_contracts.md`, build them |
| Contracts exist, not compiled | Run `pnpm compile` in `packages/contracts/`, fix errors |
| Compiled, not deployed | Run `pnpm deploy:sepolia` (needs `.env` with keys) |
| Identity vault missing | Read `_context/agent_2_identity_vault.md`, build it |
| Frontend missing | Read `_context/agent_3_frontend.md`, build it |
| All 3 done, need to integrate | Read `_context/agent_4_integration.md`, follow steps |

---

## Step 4: Environment variables

Check if `.env` exists. If not, copy from `.env.example` and fill in:
- `SEPOLIA_RPC_URL` — from QuickNode free tier (quicknode.com)
- `PRIVATE_KEY` — deployer wallet private key
- After deployment: fill in the `NEXT_PUBLIC_*` addresses

---

## Active Agent Conversation IDs (from original session)

These agents were running when the session ended. They may have completed.
Check their work by looking at the file system:

- 🔵 Agent 1 (Contracts): `7392ff18-9969-4daf-9561-298c29fc7dfd`
- 🟢 Agent 2 (Identity Vault): `989385fd-fe72-47e2-8be6-f42aa9cc685e`
- 🟠 Agent 3 (Frontend): `349ea4fd-5b40-4f06-a03c-88bace18b31b`

The agents were given shared workspace access to:
`c:\Users\naren\Desktop\Desktop\Programming\Eth_IITG`

---

## Quick Commands Reference

```bash
# From repo root:
pnpm install                              # Install all workspace deps

# Smart contracts:
cd packages/contracts
pnpm compile                              # Compile contracts
pnpm test                                 # Run tests (local Hardhat)
pnpm deploy:sepolia                       # Deploy to Sepolia (needs .env)

# Frontend:
cd apps/web
pnpm dev                                  # Start dev server at localhost:3000

# Identity vault:
cd packages/identity-vault
pnpm test                                 # Run unit tests
```

---

## The One-Liner Summary

We are building a ZK credential system where:
- Universities issue credentials on-chain via Semaphore groups
- Students prove specific credentials with ZK proofs (NO identity revealed)
- Employers verify proofs cryptographically
- Student identity is bound to a Kohaku Post-Quantum account

Contracts go on Ethereum Sepolia. Frontend is Next.js. The "wow moment" is `/verify` where the split panel shows what IS proven vs what REMAINS private.
