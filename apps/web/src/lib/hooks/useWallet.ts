'use client';
import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const switchAccount = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      // After permissions are granted, connect() will be triggered by accountsChanged
      // or we can just call it manually
      connect();
    } catch (e) {
      console.error('Switch account failed:', e);
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask not found. Please install MetaMask.');
      return;
    }
    setIsConnecting(true);
    try {
      const _provider = new BrowserProvider(window.ethereum);
      await _provider.send('eth_requestAccounts', []);
      const _signer = await _provider.getSigner();
      const _address = await _signer.getAddress();
      setProvider(_provider);
      setSigner(_signer);
      setAddress(_address);
    } catch (e) {
      console.error('Wallet connect failed:', e);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Auto-connect if previously connected
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) connect();
      });

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          connect();
        } else {
          setAddress(null);
          setSigner(null);
          setProvider(null);
        }
      };

      (window.ethereum as any).on('accountsChanged', handleAccountsChanged);
      return () => {
        (window.ethereum as any).removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [connect]);

  return { address, provider, signer, connect, switchAccount, isConnecting };
}
