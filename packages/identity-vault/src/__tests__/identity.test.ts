import { describe, it, expect } from "vitest";
import { createPQAccount, deriveIdentitySeed } from "../pq-account";
import { createIdentityFromSeed, getCommitment, exportIdentity, importIdentity } from "../identity";
import { generateCredentialProof, verifyCredentialProof } from "../proof";

describe("Identity Vault Cryptographic Library", () => {
  it("ZK-01: PQ Account creation & seed derivation is deterministic", async () => {
    const pqAccount = await createPQAccount();
    expect(pqAccount.publicKey).toBeDefined();
    expect(pqAccount.keyType).toBe("dilithium-mock");
    expect(pqAccount.isQuantumSafe).toBe(true);

    const seed1 = deriveIdentitySeed(pqAccount.publicKey);
    const seed2 = deriveIdentitySeed(pqAccount.publicKey);
    expect(seed1).toEqual(seed2);

    const identity1 = createIdentityFromSeed(seed1);
    const identity2 = createIdentityFromSeed(seed2);
    expect(getCommitment(identity1)).toEqual(getCommitment(identity2));
  });

  it("ZK-02: Identity serialization and deserialization", () => {
    const pqKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const seed = deriveIdentitySeed(pqKey);
    const identity = createIdentityFromSeed(seed);
    const serialized = exportIdentity(identity);

    const importedIdentity = importIdentity(serialized);
    expect(getCommitment(importedIdentity)).toEqual(getCommitment(identity));
  });

  it("ZK-03 & ZK-05: Off-chain ZK Proof Generation, Scope Binding, & Verification", async () => {
    const pqKey = "0xaabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344";
    const seed = deriveIdentitySeed(pqKey);
    const identity = createIdentityFromSeed(seed);

    const commitment = BigInt(getCommitment(identity));
    const groupId = 42;
    const groupMembers = [commitment];
    const jobPostingId = "JOB_GOOGLE_LEAD_PRIVACY_DEV";

    const proof = await generateCredentialProof(identity, groupId, groupMembers, jobPostingId);

    expect(proof.groupId).toBe(42);
    expect(proof.nullifier).toBeDefined();
    expect(proof.points.length).toBe(8);

    const isValid = await verifyCredentialProof(proof);
    expect(isValid).toBe(true);
  });
});
