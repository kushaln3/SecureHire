'use client';
import { useState, useEffect } from 'react';
import { Contract, keccak256, toUtf8Bytes } from 'ethers';
import { CONTRACTS, CREDENTIAL_ISSUER_ABI } from '../contracts';
import { useWallet } from './useWallet';

export function useRole() {
  const { address, signer } = useWallet();
  const [isUniversity, setIsUniversity] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address || !signer || CONTRACTS.credentialIssuer === '0x0000000000000000000000000000000000000000') return;
    setIsLoading(true);
    const contract = new Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, signer);
    const UNIVERSITY_ROLE = keccak256(toUtf8Bytes('UNIVERSITY_ROLE'));
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    Promise.all([
      contract.hasRole(UNIVERSITY_ROLE, address),
      contract.hasRole(DEFAULT_ADMIN_ROLE, address),
    ]).then(([uni, admin]) => {
      setIsUniversity(uni);
      setIsAdmin(admin);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [address, signer]);

  return { isUniversity, isAdmin, isLoading };
}
