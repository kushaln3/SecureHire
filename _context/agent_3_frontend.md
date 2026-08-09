# Agent 3 — Frontend Developer
## Context File for Session Hand-off

**Scope:** `apps/web/`  
**Status:** 🔄 RUNNING (conversation `349ea4fd-5b40-4f06-a03c-88bace18b31b`)  
**Framework:** Next.js 14+ (App Router) + Tailwind CSS  
**Package manager:** pnpm

---

## What This Agent Was Asked To Build

A full Next.js application with 4 portals/pages.

---

## Setup Commands

```bash
cd c:\Users\naren\Desktop\Desktop\Programming\Eth_IITG\apps
npx create-next-app@latest web --typescript --tailwind --app --no-git --yes
cd web
pnpm add ethers@6 @semaphore-protocol/data qrcode.react
```

---

## Design System

| Token | Value |
|---|---|
| Background | `#0a0a1a` |
| Surface/Card | `rgba(255,255,255,0.05)` + `backdrop-blur-xl` + `border border-white/10` |
| Primary accent | `#6366f1` (indigo) → `#8b5cf6` (violet) gradient |
| Success | `#10b981` (emerald) |
| Error | `#ef4444` (red) |
| Text primary | `#f1f5f9` |
| Text secondary | `#94a3b8` |
| Font | Inter (Google Fonts) |

**CSS utilities to add to `globals.css`:**
```css
.glass { @apply bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl; }
.glass-hover { @apply hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300; }
.gradient-text { @apply bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent; }
.btn-primary { @apply bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95; }
.btn-secondary { @apply border border-white/20 hover:border-white/40 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-all duration-200; }
```

---

## File Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← Navbar + background orbs + Inter font
│   │   ├── globals.css             ← Design tokens + utility classes
│   │   ├── page.tsx                ← Landing page
│   │   ├── university/
│   │   │   ├── page.tsx            ← Registration gateway
│   │   │   └── dashboard/
│   │   │       └── page.tsx        ← Authenticated university dashboard
│   │   ├── student/
│   │   │   └── page.tsx            ← Student portal
│   │   └── verify/
│   │       └── page.tsx            ← Employer verification portal
│   ├── components/
│   │   ├── WalletButton.tsx        ← MetaMask connect button
│   │   ├── GlassCard.tsx           ← Reusable glass card
│   │   └── StepBadge.tsx           ← Numbered step indicator
│   └── lib/
│       ├── contracts.ts            ← ABI + address config (SINGLE SOURCE OF TRUTH)
│       └── hooks/
│           ├── useWallet.ts        ← MetaMask connection
│           ├── useRole.ts          ← UNIVERSITY_ROLE check
│           └── useCredentials.ts   ← Fetch student credentials
```

---

## `src/lib/contracts.ts` — Single Source of Truth

```typescript
export const CONTRACTS = {
  semaphore: '0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D',
  courseRegistry: process.env.NEXT_PUBLIC_COURSE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
  credentialIssuer: process.env.NEXT_PUBLIC_CREDENTIAL_ISSUER_ADDRESS || '0x0000000000000000000000000000000000000000',
  credentialVerifier: process.env.NEXT_PUBLIC_CREDENTIAL_VERIFIER_ADDRESS || '0x0000000000000000000000000000000000000000',
} as const;

// keccak256("UNIVERSITY_ROLE") — compute with ethers at runtime
import { keccak256, toUtf8Bytes } from 'ethers';
export const UNIVERSITY_ROLE = keccak256(toUtf8Bytes('UNIVERSITY_ROLE'));

export const CREDENTIAL_ISSUER_ABI = [
  'function requestRegistration(string calldata name, string calldata metadata) external',
  'function approveUniversity(address wallet) external',
  'function createCourse(string calldata name, string calldata code) external returns (uint256)',
  'function issueCredential(uint256 groupId, uint256 commitment) external',
  'function revokeCredential(uint256 groupId, uint256 commitment) external',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function isUniversity(address wallet) external view returns (bool)',
  'function getUniversity(address wallet) external view returns (tuple(string name, string metadata, bool approved, uint256 registeredAt))',
  'event RegistrationRequested(address indexed wallet, string name, string metadata)',
  'event UniversityApproved(address indexed wallet, string name)',
  'event CourseCreated(uint256 indexed groupId, string name, string code, address indexed university)',
  'event CredentialIssued(uint256 indexed groupId, uint256 indexed commitment, uint256 timestamp)',
];

export const COURSE_REGISTRY_ABI = [
  'function getCourse(uint256 groupId) external view returns (tuple(string name, string code, uint256 groupId, address university, bool active))',
  'function getAllGroupIds() external view returns (uint256[])',
  'function isValidCourse(uint256 groupId) external view returns (bool)',
  'function courseCount() external view returns (uint256)',
];

export const CREDENTIAL_VERIFIER_ABI = [
  'function verifyCredential(tuple(uint256 merkleTreeDepth, uint256 merkleTreeRoot, uint256 nullifier, uint256 message, uint256 scope, uint256[8] points) calldata proof, uint256 groupId) external returns (bool)',
  'function isNullifierUsed(uint256 nullifier) external view returns (bool)',
  'event CredentialVerified(uint256 indexed groupId, uint256 indexed nullifier, uint256 message, bool valid)',
];
```

---

## Portal Specifications

### `/` — Landing Page

**Sections:**
1. **Hero**: "Prove Your Credentials. Reveal Nothing." with gradient animated text. 3 CTA glass cards (Student / University / Employer)
2. **Stats bar**: 47 Credentials | 12 Verifications | 3 Universities | 0 Privacy Breaches (mock)
3. **How It Works**: 5-step horizontal flow with icons and arrows
4. **Tech Stack badges**: Semaphore v4 | Kohaku PQ | Ethereum Sepolia | ZK Proofs
5. **Footer**: IITG Hackathon 2026 badge

### `/university` — University Gateway

Two states driven by `useRole()`:
- **No role**: Registration form (name, department, email) → `requestRegistration()` → "Awaiting Approval" state
- **Has UNIVERSITY_ROLE**: "Welcome back" + CTA to `/university/dashboard`

### `/university/dashboard` — Authenticated Dashboard

Guard: redirect to `/university` if no role.

Two tabs:
1. **Courses**: Grid of course cards + "Add Course" button/modal → `createCourse(name, code)`
2. **Issue Credentials**: Commitment input + course selector → `issueCredential(groupId, commitment)`

### `/student` — Student Portal

Four glass card sections (user scrolls through):

1. **Generate Identity**: Button → creates Semaphore identity + mock PQ account  
   - Show PQ public key (truncated) + commitment hash (full, copyable)
   - Use inline code (NOT the identity-vault library — that's separate):
     ```typescript
     // PQ mock: just random bytes
     const keyBytes = crypto.getRandomValues(new Uint8Array(64));
     const pqKey = '0x' + Array.from(keyBytes).map(b => b.toString(16).padStart(2,'0')).join('');
     // Semaphore identity from seed
     const { Identity } = await import('@semaphore-protocol/identity');
     const identity = new Identity(pqKey);
     localStorage.setItem('identity', identity.export());
     ```

2. **Share with University**: Copyable commitment hash box

3. **My Credentials**: Mock data + note "fetched from Semaphore groups on Sepolia"

4. **Generate Proof**: Course selector + job ID input → "Generate ZK Proof" button  
   - Shows loading state (10-30 seconds)
   - Shows proof JSON in code block + QR code (`qrcode.react`)
   - Copy + Download buttons

### `/verify` — Employer Verification

**Input**: Proof JSON textarea + course selector + job ID input + Verify button

**Success state** (THE HERO MOMENT — make it stunning):
```
✅ CREDENTIAL VERIFIED

┌──────────────────────┬──────────────────────────┐
│  WHAT YOU KNOW       │  WHAT REMAINS PRIVATE     │
│  ✅ Passed: DSAI Minor│  🔒 Student Identity       │
│  ✅ Issued by: IITG   │  🔒 Wallet Address         │
│  ✅ ZK Proof: Valid   │  🔒 Full Transcript        │
│  ✅ Replay Protected  │  🔒 Other Credentials      │
└──────────────────────┴──────────────────────────┘

Nullifier: 0x1234...5678  |  Verified: Aug 10 01:30 IST
Powered by Semaphore v4 + Ethereum Sepolia
```

**Failure state**: Red panel with ❌ + error reason.

---

## Key Implementation Notes

1. All pages must have `'use client'` directive
2. Add `declare global { interface Window { ethereum?: any } }` in a `.d.ts` file
3. No crashes if MetaMask absent — show "Connect Wallet" prompt
4. All contract calls: wrap in try/catch, show user-friendly errors
5. Show loading spinners for all async ops
6. `qrcode.react` usage: `<QRCodeSVG value={JSON.stringify(proof)} size={200} />`

---

## Hooks

### `useWallet.ts`
Returns: `{ address, provider, signer, connect, isConnecting }`
- Uses `ethers.BrowserProvider`
- Auto-reconnects if previously connected

### `useRole.ts`
Returns: `{ isUniversity, isAdmin, isLoading }`
- Calls `credentialIssuer.hasRole(UNIVERSITY_ROLE, address)`
- `UNIVERSITY_ROLE = keccak256(toUtf8Bytes("UNIVERSITY_ROLE"))`

### `useCredentials.ts`
Returns: `{ credentials: Course[], isLoading }`
- Uses `@semaphore-protocol/data` to query which groups a commitment is in

---

## Environment Variables Needed

Create `apps/web/.env.local` (copied from root `.env` after deployment):
```bash
NEXT_PUBLIC_COURSE_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_CREDENTIAL_ISSUER_ADDRESS=0x...
NEXT_PUBLIC_CREDENTIAL_VERIFIER_ADDRESS=0x...
NEXT_PUBLIC_SEMAPHORE_ADDRESS=0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D
```

---

## Deliverables Checklist

- [ ] `pnpm dev` starts without errors
- [ ] Landing page renders with hero + stats + how-it-works
- [ ] `/university` shows registration form (no wallet) or welcome (with role)
- [ ] `/university/dashboard` renders course grid + issue form
- [ ] `/student` renders all 4 sections, identity generation works
- [ ] `/verify` renders input + privacy proof result panel
- [ ] WalletButton connects MetaMask
- [ ] Dark theme with glassmorphism applied throughout
