# Agent 4 — Integration
## Context File for Session Hand-off

**Scope:** Wiring all 3 components together + final demo prep  
**Status:** ⏳ NOT STARTED — runs AFTER Agents 1, 2, and 3 complete  
**Depends on:** Agent 1 deploying to Sepolia, Agent 2 completing identity-vault, Agent 3 completing frontend

---

## Trigger Condition

Start this agent ONLY when:
- [ ] `packages/contracts/deployments/sepolia.json` exists with real addresses
- [ ] `packages/identity-vault/src/index.ts` exists and compiles
- [ ] `apps/web/` exists and `pnpm dev` works (even with placeholder addresses)

---

## Step 1: Wire Contract Addresses

Read `packages/contracts/deployments/sepolia.json`, then:

1. Create/update `apps/web/.env.local`:
```bash
NEXT_PUBLIC_COURSE_REGISTRY_ADDRESS=<from sepolia.json>
NEXT_PUBLIC_CREDENTIAL_ISSUER_ADDRESS=<from sepolia.json>
NEXT_PUBLIC_CREDENTIAL_VERIFIER_ADDRESS=<from sepolia.json>
NEXT_PUBLIC_SEMAPHORE_ADDRESS=0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D
```

2. Also copy the full `deployments/sepolia.json` to `apps/web/src/lib/deployments.json` (if not done by deploy script)

---

## Step 2: Wire identity-vault into Frontend

Add to `apps/web/package.json`:
```json
{
  "dependencies": {
    "@eternity-id/identity-vault": "workspace:*"
  }
}
```

Run `pnpm install` from repo root.

Then in `apps/web/src/app/student/page.tsx`, replace the inline identity code with:
```typescript
import { createPQAccount, deriveIdentitySeed, createIdentityFromSeed, getCommitment, generateCredentialProof, verifyCredentialProof } from '@eternity-id/identity-vault';
```

---

## Step 3: End-to-End Test on Sepolia

Run through this flow manually in the browser (with MetaMask connected to Sepolia):

### Flow 1: University Registration
1. Go to `/university`
2. Connect university wallet (Wallet B)
3. Fill registration form → submit → see "Awaiting Approval"
4. Switch to deployer wallet → call `approveUniversity(walletB)` directly via console or Etherscan
5. Switch back to Wallet B → refresh `/university` → should see "Welcome back" + dashboard link

### Flow 2: Course Creation
1. Go to `/university/dashboard` (as Wallet B)
2. Click "Add Course"
3. Enter: Name = "DSAI Minor", Code = "DSAI001"
4. Submit → wait for transaction → course appears in grid

### Flow 3: Credential Issuance
1. Go to `/student` (any wallet, or no wallet)
2. Click "Generate Quantum-Safe Identity"
3. Copy the commitment hash
4. Go to `/university/dashboard` → "Issue Credentials" tab
5. Paste the commitment + select "DSAI Minor" → submit
6. Go back to `/student` → "My Credentials" should show "DSAI Minor — IITG"

### Flow 4: Proof Generation
1. On `/student`, go to "Generate Proof" section
2. Select "DSAI Minor"
3. Enter Job ID: "job-google-123"
4. Click "Generate ZK Proof" (wait 15-30 seconds)
5. Copy the proof JSON

### Flow 5: Employer Verification
1. Go to `/verify`
2. Paste proof JSON
3. Select course "DSAI Minor"
4. Enter same Job ID: "job-google-123"
5. Click "Verify Credential"
6. See the ✅ split panel with "WHAT YOU KNOW" vs "WHAT REMAINS PRIVATE"

---

## Step 4: Demo Rehearsal Script

**3-minute demo flow for judges:**

```
[00:00] Open landing page — explain the problem in one sentence
[00:30] Go to /university — register "IIT Guwahati Finance Dept"
[01:00] Approve (show Etherscan tx or console) — go to dashboard
[01:15] Create course "DSAI Minor"
[01:30] Open /student in incognito — generate ZK identity
[01:45] Copy commitment — paste into /university/dashboard — issue credential
[02:00] Back to /student — show "My Credentials" panel
[02:15] Generate ZK Proof — watch proof generate
[02:30] Open /verify — paste proof — click Verify
[02:45] HERO MOMENT: Show the split panel (✅ known vs 🔒 private)
[03:00] "We proved DSAI Minor was passed. We know nothing else."
```

---

## Step 5: Fix Any Integration Issues

Common issues to watch for:

1. **Proof generation fails in browser**: Semaphore uses WASM — may need `next.config.js` update:
   ```javascript
   // next.config.js
   module.exports = {
     webpack: (config) => {
       config.experiments = { asyncWebAssembly: true, layers: true };
       return config;
     },
   };
   ```

2. **BigInt serialization**: JSON.stringify can't handle BigInt. Wrap in `.toString()` when encoding proof.

3. **CORS on Semaphore data queries**: Use direct contract calls if CORS blocks subgraph queries.

4. **MetaMask network check**: Ensure user is on Sepolia (chainId: 11155111) before any contract calls.

---

## Step 6: Final Polish

- [ ] Replace all mock/placeholder data with real on-chain data
- [ ] Test with real Sepolia transactions
- [ ] Check mobile responsiveness
- [ ] Verify all error states show user-friendly messages
- [ ] Update `ideas.md` with final deployed addresses

---

## Step 7: Update ideas.md

Add deployed addresses to the bottom of `ideas.md`:
```markdown
## Deployed Contracts (Sepolia)
- CourseRegistry: 0x...
- CredentialIssuer: 0x...
- CredentialVerifier: 0x...
- Deployed by: [your wallet address]
- Block: [block number]
```

---

## Deliverables Checklist

- [ ] `.env.local` in `apps/web/` with real deployed addresses
- [ ] End-to-end flow works on Sepolia
- [ ] Demo rehearsed and timed at ~3 minutes
- [ ] `ideas.md` updated with deployed addresses
- [ ] App running at `http://localhost:3000`
