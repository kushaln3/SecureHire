import { generateProof, verifyProof } from '@semaphore-protocol/proof';
import { Group } from '@semaphore-protocol/group';
import type { Identity } from '@semaphore-protocol/identity';
import type { CredentialProof } from './types';

import { ethers } from 'ethers';

export async function generateCredentialProof(
  identity: Identity,
  groupId: number,
  groupMembers: bigint[],
  jobPostingId: string
): Promise<CredentialProof> {
  const group = new Group();
  group.addMembers(groupMembers);

  // The scope is a BigInt derived from the jobPostingId AND the groupId
  // This prevents the same proof from being replayed for a different job, 
  // while ensuring nullifiers are unique per group within the same bundle.
  const scopeString = `${groupId}-${jobPostingId}`;
  const scopeHash = ethers.id(scopeString);
  const scope = BigInt('0x' + scopeHash.slice(2, 18));
  
  // The message is a fixed signal for credential verification
  const message = BigInt(1); // "1" = credential verified

  const proof = await generateProof(identity, group, message, scope);

  return {
    merkleTreeDepth: proof.merkleTreeDepth,
    merkleTreeRoot: proof.merkleTreeRoot.toString(),
    nullifier: proof.nullifier.toString(),
    message: proof.message.toString(),
    scope: proof.scope.toString(),
    points: proof.points.map(p => p.toString()),
    groupId,
  };
}

export async function verifyCredentialProof(proof: CredentialProof): Promise<boolean> {
  // Semaphore v4: SemaphoreProof uses string fields (not bigint)
  const semaphoreProof = {
    merkleTreeDepth: proof.merkleTreeDepth,
    merkleTreeRoot: proof.merkleTreeRoot,
    nullifier: proof.nullifier,
    message: proof.message,
    scope: proof.scope,
    points: proof.points as [string, string, string, string, string, string, string, string],
  };
  return verifyProof(semaphoreProof);
}

export function encodeProofForContract(proof: CredentialProof) {
  return {
    merkleTreeDepth: proof.merkleTreeDepth,
    merkleTreeRoot: BigInt(proof.merkleTreeRoot),
    nullifier: BigInt(proof.nullifier),
    message: BigInt(proof.message),
    scope: BigInt(proof.scope),
    points: proof.points.map(p => BigInt(p)),
  };
}
