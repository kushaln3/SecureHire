export interface PQAccount {
  publicKey: string;           // hex-encoded public key
  keyType: 'dilithium' | 'dilithium-mock';
  isQuantumSafe: boolean;
  isRealPQ: boolean;           // true only if @kohaku-eth/pq-account actually loaded
  accountAddress?: string;     // ERC-4337 smart account address if available
}

export interface CredentialProof {
  merkleTreeDepth: number;
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  points: string[];
  groupId: number;
}
