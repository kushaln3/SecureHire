# Agent Context
Date: 2026-08-09
Phase: Ideation & Research (Deep Dive Complete)

## State
- Hackathon: Building Private Apps using Ethereum (IIT Guwahati)
- Prize Tracks: Best Use of Semaphore | Best Use of Kohaku | Privacy Innovation
- Approach: Slow, deliberate ideation. Quality > speed. No rushing.

## Privacy Ecosystem Research Summary

### 1. Semaphore (PSE / EF)
- ZK-SNARK protocol for anonymous group membership and signaling
- Identity ? Group (Merkle tree) ? Signal (with nullifier to prevent double-signaling)
- V4 (latest), audited, trusted setup done (400+ participants)
- On-chain Solidity contracts + off-chain JS libraries
- Best for: Anonymous voting, whistleblowing, anonymous DAOs, sybil-resistance

### 2. Privacy Pools (0xBow)
- Compliance-friendly private transactions (deposit ? withdraw privately)
- Three layers: Contracts | ZK (commitment + withdrawal circuits) | ASP (Association Set Provider for compliance)
- Key feature: Ragequit mechanism if ASP rejects your deposit
- Best for: Private payments, compliant mixers, confidential treasury

### 3. Railgun
- On-chain ZK privacy shield for DeFi. UTXO model w/ Poseidon hashes + SNARKs
- Allows private swaps, transfers, yield farming on L1/L2
- Best for: Privacy-preserving DeFi interactions

### 4. Kohaku (Ethereum Wallet Privacy Roadmap)
- SDK + reference wallet (browser extension fork of Ambire) for privacy-first wallets
- Key features planned:
  - Embedded Helios light client (no RPC trust needed)
  - Private RPCs via TEE+ORAM
  - Private sends/receives via various protocols (Railgun, Privacy Pools etc.)
  - One account per dApp (ERC-7811 stealth addresses)
  - ZK social recovery (ZKEmail, ZKPassport, Anon Aadhaar)
  - Post-quantum killswitch (Falcon/Dilithium)
  - P2P transactions (no RPC nodes)
- Collaborators: Ambire, Railgun, Helios (a16z), PSE, Wonderland, Oblivious Labs
- Important: Kohaku is the wallet SDK layer that integrates ALL these protocols

## Key Insight
Kohaku is the unifying privacy CLIENT layer. Semaphore is the privacy IDENTITY layer. Railgun/Privacy Pools are the privacy PAYMENT layers. A winning project would ideally compose these layers together into a coherent user-facing application.

## Current State
- All documentation reviewed
- Ready to deep brainstorm ideas for both tracks
- See ideas.md for initial concepts
