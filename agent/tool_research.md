# Tool Research: Semaphore & Kohaku
Last Updated: 2026-08-09

This document contains the synthesized research on both tools so any LLM can quickly understand their capabilities.

---

## SEMAPHORE (v4)
Source: semaphore.pse.dev | npm: @semaphore-protocol

### What it does (plain English)
Semaphore lets you prove you are a member of a group WITHOUT revealing which member you are.
Example: "I am a verified IITG student" — but nobody knows which student.

### Core Concepts
1. **Identity**: Each user has a private `secret` (v4 simplified from 2 secrets to 1). From this, a public `commitment` is derived. Only the commitment goes on-chain — never the secret.

2. **Group**: A smart contract that stores a list of identity commitments (a Merkle Tree). Think of it as a "whitelist" of anonymous members.
   - Uses **LeanIMT** (Lean Incremental Merkle Tree) — more gas-efficient than v3.
   - Supports dynamic tree depths (1-32).

3. **Proof**: When a user wants to "signal" (vote, post, verify), they generate a ZK proof off-chain that says:
   - "My identity commitment is in this group's Merkle Tree" (I'm a member)
   - "I am attaching this specific `message`" (the signal/vote/content)
   - "For this specific `scope`" (prevents double-voting/replay attacks)
   - The proof reveals NO information about which member sent it.

4. **Nullifier**: A one-way hash derived from the identity secret + scope. Prevents the same user from signaling twice in the same context. On-chain, the contract stores used nullifiers to prevent replays.

### V4 Key Changes (what's NEW and relevant)
- `External Nullifier` → now called **`Scope`** (cleaner naming)
- `SignalHash` → now called **`Message`**
- Single `secret` per identity instead of (trapdoor + nullifier)
- LeanIMT for cheaper, dynamic-depth trees
- Can generate digital signatures from the identity — NEW, useful for credential systems

### NPM Packages (what to install)
```bash
npm i @semaphore-protocol/contracts  # Solidity: Semaphore.sol, SemaphoreGroups.sol
npm i @semaphore-protocol/identity   # JS: create/manage identities
npm i @semaphore-protocol/group      # JS: manage Merkle groups off-chain
npm i @semaphore-protocol/proof      # JS: generate + verify proofs
npm i @semaphore-protocol/hardhat    # Hardhat tasks: deploy verifiers
```

### Smart Contracts
- `SemaphoreVerifier.sol` — verifies Groth16 ZK proofs on-chain
- `SemaphoreGroups.sol` — manages group membership (add/remove members)
- `Semaphore.sol` — main entry point: `verifyProof()` and `validateProof()`

### What Semaphore CAN'T do
- It does NOT hide money / asset amounts.
- It does NOT break transaction graph links.
- It is purely about IDENTITY and SIGNALING anonymously.

---

## KOHAKU
Source: github.com/ethereum/kohaku | ethereum.github.io/kohaku

### What it does (plain English)
Kohaku is an open-source SDK from the Ethereum Foundation. It is a "privacy OS" for wallets.
It lets you interact with multiple shielded pool protocols (Railgun, Privacy Pools, Tornado Cash) through a single, unified interface — without the user needing to understand the complexity of each underlying protocol.

### Core Packages (the actual usable pieces)
| Package | Status | What it does |
|---|---|---|
| `@kohaku-eth/railgun` | ✅ | Interface for Railgun shielded pool — shield/unshield assets |
| `@kohaku-eth/tornado-cash` | ✅ | Interface for Tornado Cash protocol |
| `@kohaku-eth/privacy-pools` | ✅ | Interface for Privacy Pools (Vitalik's newer protocol) |
| `@kohaku-eth/plugins` | ✅ | Standardized plugin interface for all shielded pools |
| `@kohaku-eth/provider` | ✅ | Provider abstraction (supports ethers, viem, helios, colibri) |
| `@kohaku-eth/pq-account` | ✅ | **Post-Quantum ERC-4337 smart account** — cutting edge |

### What it does technically
1. **Shielding**: Takes your public ERC-20 tokens and deposits them into an encrypted pool. Your balance is now hidden.
2. **Private Transfer**: Transfers funds inside the encrypted pool. No on-chain trace.
3. **Unshielding**: Withdraws funds to a fresh address. The link between depositor and recipient is broken by the ZK proof.
4. **PPOI (Privacy Pool Origin Integrity)**: For Privacy Pools — funds need to "wait" to accumulate in an anonymity set before withdrawal is truly private.

### The REALLY interesting NEW feature: `@kohaku-eth/pq-account`
This is a **Post-Quantum ERC-4337 Account** implementation. This means:
- It is a smart wallet that uses post-quantum cryptography (resistant to quantum computers).
- Built on Account Abstraction (ERC-4337) — meaning no traditional private key; the "account" is a smart contract.
- This is extremely novel and very few projects have implemented this.

### What Kohaku CAN'T do
- It cannot prove identity or group membership.
- It is purely about hiding MONEY and TRANSACTIONS.
- It does NOT provide Sybil-resistance on its own.

---

## KEY INSIGHT: The Gap Between Them

**Semaphore** = Anonymous IDENTITY + SIGNALING (who you are, what you say — secretly)
**Kohaku** = Anonymous MONEY (what you send, how much — secretly)

The most powerful ideas combine BOTH:
- Prove you have the RIGHT to act (Semaphore) → then act with HIDDEN funds (Kohaku)

### Unexplored combinations to brainstorm from:
1. **Anonymous Credentialing + Private Reward**: Prove you met a condition (Semaphore) → receive a payment to a fresh address (Kohaku). Use case: Anonymous bug bounties, private scholarship disbursements.
2. **Private Governance with Real Stakes**: Vote anonymously (Semaphore) + stake funds that are also private (Kohaku). If you vote wrong/fraudulently, your stake is slashed — but still anonymously.
3. **pq-account + Anonymous Identity**: Combine the Post-Quantum Account from Kohaku with a Semaphore identity. Future-proof anonymous accounts.
4. **Anonymous Whistleblowing + Reward Pool**: Submit proof of wrongdoing anonymously (Semaphore signal), claim reward from a Kohaku shielded pool without revealing yourself.
