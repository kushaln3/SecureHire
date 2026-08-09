import { Identity } from '@semaphore-protocol/identity';

export function createIdentityFromSeed(seed: string): Identity {
  return new Identity(seed);
}

export function createRandomIdentity(): Identity {
  return new Identity();
}

export function exportIdentity(identity: Identity): string {
  return identity.export();
}

export function importIdentity(serialized: string): Identity {
  return Identity.import(serialized);
}

export function getCommitment(identity: Identity): string {
  return identity.commitment.toString();
}
