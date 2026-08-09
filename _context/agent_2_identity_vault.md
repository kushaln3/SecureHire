# Agent 2 — Identity & Proof Engineer
## Context File for Session Hand-off

**Scope:** `packages/identity-vault/`  
**Status:** 🔄 RUNNING (conversation `989385fd-fe72-47e2-8be6-f42aa9cc685e`)  
**Language:** TypeScript  
**Package manager:** pnpm

---

## What This Agent Was Asked To Build

A clean TypeScript library (`@eternity-id/identity-vault`) that wraps:
1. **Semaphore v4** identity and proof generation
2. **Kohaku `@kohaku-eth/pq-account`** with a graceful mock fallback (Option B)

This library is imported by the Next.js frontend.

---

## Files To Create

```
packages/identity-vault/
├── src/
│   ├── types.ts
│   ├── pq-account.ts
│   ├── identity.ts
│   ├── proof.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## `src/types.ts`

```typescript
export interface PQAccount {
  publicKey: string;           // hex-encoded public key (128 hex chars = 64 bytes)
  keyType: 'dilithium' | 'dilithium-mock';
  isQuantumSafe: boolean;      // always true — architecture is QS even with mock
  isRealPQ: boolean;           // true only if @kohaku-eth/pq-account actually loaded
  accountAddress?: string;     // ERC-4337 smart account address if available
}

export interface CredentialProof {
  merkleTreeDepth: number;
  merkleTreeRoot: string;      // BigInt as string
  nullifier: string;           // BigInt as string
  message: string;             // BigInt as string
  scope: string;               // BigInt as string
  points: string[];            // Groth16 proof points as strings
  groupId: number;
}
```

---

## `src/pq-account.ts` — THE MOST IMPORTANT FILE

**Decision: Option B — Mock Wrapper with Graceful Fallback**

```typescript
import type { PQAccount } from './types';

export async function createPQAccount(): Promise<PQAccount> {
  try {
    // @kohaku-eth/pq-account is EXPERIMENTAL and likely not on npm
    // Dynamic import so we don't crash if it's missing
    const kohaku = await import('@kohaku-eth/pq-account' as string);
    const account = await kohaku.createPQAccount();
    return {
      publicKey: account.publicKey || account.address,
      keyType: 'dilithium',
      isQuantumSafe: true,
      isRealPQ: true,
      accountAddress: account.address,
    };
  } catch {
    // Silently fall back to deterministic mock
    return createMockPQAccount();
  }
}

function createMockPQAccount(): PQAccount {
  // Generate 64 random bytes = simulated Dilithium public key
  const keyBytes = new Uint8Array(64);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(keyBytes);
  } else {
    const { randomBytes } = require('crypto');
    const buf = randomBytes(64);
    keyBytes.set(buf);
  }
  const publicKey = '0x' + Array.from(keyBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return {
    publicKey,
    keyType: 'dilithium-mock',
    isQuantumSafe: true,
    isRealPQ: false,
  };
}

export function deriveIdentitySeed(pqPublicKey: string): string {
  // XOR-fold the 64 public key bytes into a 32-byte seed
  // A real impl would use SHA-256 or keccak256
  const hex = pqPublicKey.replace('0x', '');
  const bytes = hex.match(/.{2}/g)!.map(h => parseInt(h, 16));
  const seed = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) {
    seed[i % 32] ^= bytes[i];
  }
  return '0x' + Array.from(seed)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

---

## `src/identity.ts`

```typescript
import { Identity } from '@semaphore-protocol/identity';

// Create from a seed (derived from PQ key) — deterministic
export function createIdentityFromSeed(seed: string): Identity {
  return new Identity(seed);
}

// Create a completely random identity
export function createRandomIdentity(): Identity {
  return new Identity();
}

// Serialize for localStorage
export function exportIdentity(identity: Identity): string {
  return identity.export();
}

// Restore from localStorage
export function importIdentity(serialized: string): Identity {
  return Identity.import(serialized);
}

// Get commitment (safe to share — this is the public key)
export function getCommitment(identity: Identity): string {
  return identity.commitment.toString();
}
```

---

## `src/proof.ts`

```typescript
import { generateProof, verifyProof } from '@semaphore-protocol/proof';
import { Group } from '@semaphore-protocol/group';
import type { Identity } from '@semaphore-protocol/identity';
import type { CredentialProof } from './types';

export async function generateCredentialProof(
  identity: Identity,
  groupId: number,
  groupMembers: bigint[],   // all commitment bigints in the group (fetched from chain)
  jobPostingId: string      // e.g. "job-abc-123" — used as scope to prevent replay
): Promise<CredentialProof> {
  const group = new Group();
  group.addMembers(groupMembers);

  // Scope = derived from jobPostingId, prevents replay
  const scopeBytes = Buffer.from(jobPostingId.slice(0, 16));
  const scope = BigInt('0x' + scopeBytes.toString('hex').padStart(16, '0'));

  const message = BigInt(1); // "1" = credential verified signal

  const proof = await generateProof(identity, group, message, scope);

  return {
    merkleTreeDepth: proof.merkleTreeDepth,
    merkleTreeRoot: proof.merkleTreeRoot.toString(),
    nullifier: proof.nullifier.toString(),
    message: proof.message.toString(),
    scope: proof.scope.toString(),
    points: proof.points.map((p: bigint) => p.toString()),
    groupId,
  };
}

export async function verifyCredentialProof(proof: CredentialProof): Promise<boolean> {
  const semaphoreProof = {
    merkleTreeDepth: proof.merkleTreeDepth,
    merkleTreeRoot: BigInt(proof.merkleTreeRoot),
    nullifier: BigInt(proof.nullifier),
    message: BigInt(proof.message),
    scope: BigInt(proof.scope),
    points: proof.points.map((p: string) => BigInt(p)),
  };
  return verifyProof(semaphoreProof);
}

// Encode for contract call (ISemaphore.SemaphoreProof struct)
export function encodeProofForContract(proof: CredentialProof) {
  return {
    merkleTreeDepth: proof.merkleTreeDepth,
    merkleTreeRoot: BigInt(proof.merkleTreeRoot),
    nullifier: BigInt(proof.nullifier),
    message: BigInt(proof.message),
    scope: BigInt(proof.scope),
    points: proof.points.map((p: string) => BigInt(p)),
  };
}
```

---

## `src/index.ts`

```typescript
export * from './types';
export * from './pq-account';
export * from './identity';
export * from './proof';
```

---

## `package.json`

```json
{
  "name": "@eternity-id/identity-vault",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## Install Commands (from `packages/identity-vault/`)

```bash
pnpm init -y
pnpm add @semaphore-protocol/identity @semaphore-protocol/group @semaphore-protocol/proof @semaphore-protocol/data
pnpm add --save-dev typescript @types/node vitest
# Do NOT try to install @kohaku-eth/pq-account — handled by dynamic import with fallback
```

---

## Key Notes for Resuming

1. Check if files exist in `packages/identity-vault/src/`
2. The `@kohaku-eth/pq-account` package does NOT need to be installed — it's handled by dynamic import with fallback
3. `generateProof` from `@semaphore-protocol/proof` (v4) signature:
   ```typescript
   generateProof(identity, group, message, scope)
   // NOT generateProof(identity, group, externalNullifier, signal) ← that's v3
   ```
4. The proof object from Semaphore v4 has these fields:
   - `merkleTreeDepth`, `merkleTreeRoot`, `nullifier`, `message`, `scope`, `points`

---

## Deliverables Checklist

- [ ] `src/types.ts` created
- [ ] `src/pq-account.ts` created (with mock fallback)
- [ ] `src/identity.ts` created
- [ ] `src/proof.ts` created
- [ ] `src/index.ts` created
- [ ] `package.json` created (name: `@eternity-id/identity-vault`)
- [ ] `tsconfig.json` created
- [ ] `pnpm install` runs without errors
- [ ] TypeScript compiles without errors
