'use client';
import { useWallet } from '../lib/hooks/useWallet';

export default function WalletButton() {
  const { address, connect, switchAccount, isConnecting } = useWallet();

  if (address) {
    return (
      <button 
        onClick={switchAccount}
        title="Click to switch MetaMask account"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '0.375rem 0.875rem',
          borderRadius: '9999px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
      >
        <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#4ade80' }} />
        <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#cbd5e1' }}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="btn-primary"
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}
    >
      {isConnecting ? (
        <div style={{ width: '1rem', height: '1rem', borderRadius: '9999px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0f1115', animation: 'spin 0.8s linear infinite' }} />
      ) : null}
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
