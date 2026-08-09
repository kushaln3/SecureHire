import type { PQAccount } from './types';

export async function createPQAccount(): Promise<PQAccount> {
  try {
    // Attempt real Kohaku import
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
    return createMockPQAccount();
  }
}

function createMockPQAccount(): PQAccount {
  // Generate 64 random bytes as the mock Dilithium public key
  const keyBytes = new Uint8Array(64);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(keyBytes);
  } else {
    // Node.js fallback
    const { randomBytes } = require('crypto');
    const buf = randomBytes(64);
    keyBytes.set(buf);
  }
  const publicKey = '0x' + Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return {
    publicKey,
    keyType: 'dilithium-mock',
    isQuantumSafe: true,  // architecturally quantum-safe
    isRealPQ: false,
  };
}

export function deriveIdentitySeed(pqPublicKey: string): string {
  // Simple deterministic hash: XOR fold the public key bytes into a 32-byte seed
  // In a real impl, use SHA-256 or keccak256
  const hex = pqPublicKey.replace('0x', '');
  const bytes = hex.match(/.{2}/g)!.map(h => parseInt(h, 16));
  const seed = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) {
    seed[i % 32] ^= bytes[i];
  }
  return '0x' + Array.from(seed).map(b => b.toString(16).padStart(2, '0')).join('');
}
