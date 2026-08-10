# HireShield: Quantum-Safe Anonymous Credentials

## The Core Concept
A credentialing system that allows users to hold and prove their qualifications (like university degrees) anonymously and securely against future quantum computing threats.

## Key Technologies

### 1. Kohaku: Post-Quantum Smart Accounts (`@kohaku-eth/pq-account`)
Traditional wallets (like MetaMask) rely on Elliptic Curve Cryptography, which is vulnerable to future quantum computers. 
- We deploy an ERC-4337 Smart Account for the user using Kohaku's experimental post-quantum package.
- This serves as the secure, quantum-resistant vault holding the user's decentralized identifiers (DIDs) or verifiable credentials (VCs).

### 2. Semaphore v4: Anonymous Digital Signatures
Semaphore v4 introduced the ability for an anonymous identity to sign messages.
- The user is added to a Semaphore group (e.g., "IITG 2026 Graduates") by an authority.
- The user can generate a Zero-Knowledge proof and **sign** a message proving they belong to this group, without revealing their specific identity or wallet address.
- This allows for anonymous login to gated systems, or anonymous signing of contracts by a "Verified Graduate".

## System Flow (Ideation Phase)
1. **Setup (Top-Level):** The Ministry of Education (MoE) deploys the smart contract. They hold the `DEFAULT_ADMIN_ROLE` and are the only entity that can approve universities.
2. **University Onboarding:** A University requests registration. The MoE approves them on-chain. The University then creates a Semaphore Group for a course (e.g., "DSAI Minor").
3. **Registration:** A student creates a Post-Quantum Smart Account (via Kohaku). They generate a Semaphore Identity and provide the public commitment to the University.
3. **Issuance (Transcript as a Tree):** The University issues a credential where the student's entire transcript (courses, grades) is hashed into a Merkle Tree. The University adds the student's commitment + transcript root to the Semaphore Group.
4. **Verification (Selective Disclosure):** The student wants to apply for a Data Science job anonymously. They generate a ZK-proof off-chain, proving they are in the group AND proving that "DSAI Minor: Pass" is a valid leaf in their transcript tree, *without* revealing their other grades or their name.
5. **Validation:** The employer's smart contract or backend verifies the proof. The employer definitively knows the applicant passed the DSAI minor and is a verified graduate, but knows nothing else about their academic history or identity.
