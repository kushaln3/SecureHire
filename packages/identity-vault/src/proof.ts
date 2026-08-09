import { generateProof, verifyProof } from '@semaphore-protocol/proof';
import { Group } from '@semaphore-protocol/group';
import type { Identity } from '@semaphore-protocol/identity';
import type { CredentialProof } from './types';

export async function generateCredentialProof(
  identity: Identity,
  groupId: number,
  groupMembers: bigint[],
  jobPostingId: string
): Promise<CredentialProof> {
  const group = new Group();
  group.addMembers(groupMembers);

  // The scope is a BigInt derived from the jobPostingId
  // This prevents the same proof from being replayed for a different job
  const scope = BigInt('0x' + Buffer.from(jobPostingId).toString('hex').slice(0, 16));
  
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
  const semaphoreProof = {
    merkleTreeDepth: proof.merkleTreeDepth,
    merkleTreeRoot: BigInt(proof.merkleTreeRoot),
    nullifier: BigInt(proof.nullifier),
    message: BigInt(proof.message),
    scope: BigInt(proof.scope),
    points: proof.points.map(p => BigInt(p)),
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
