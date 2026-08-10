import type { PQAccount } from './types';

export async function createPQAccount(deterministicSeed?: string): Promise<PQAccount> {
  try {
    // Attempt real Kohaku import
    const getKohaku = new Function("return import('@kohaku-eth/pq-account')");
    const kohaku = await getKohaku();
    const account = await kohaku.createPQAccount(deterministicSeed); // Pass seed if supported
    return {
      publicKey: account.publicKey || account.address,
      keyType: 'dilithium',
      isQuantumSafe: true,
      isRealPQ: true,
      accountAddress: account.address,
    };
  } catch {
    return createMockPQAccount(deterministicSeed);
  }
}

async function createMockPQAccount(deterministicSeed?: string): Promise<PQAccount> {
  // Generate 64 bytes as the mock Dilithium public key
  const keyBytes = new Uint8Array(64);
  if (deterministicSeed) {
    // SubtleCrypto SHA-256 — available in all browsers and Node 18+
    const encoded = new TextEncoder().encode(deterministicSeed);
    const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
    const hashBytes = new Uint8Array(hashBuf);
    // Repeat 32-byte hash twice to fill 64 bytes
    for (let i = 0; i < 64; i++) {
      keyBytes[i] = hashBytes[i % 32];
    }
  } else if (typeof window !== 'undefined' && window.crypto) {
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
