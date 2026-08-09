'use client';
import { useWallet } from '../lib/hooks/useWallet';

export default function WalletButton() {
  const { address, connect, isConnecting } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2 glass px-4 py-2 rounded-full border-indigo-500/30 shadow-sm shadow-indigo-500/10">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow"></div>
        <span className="font-mono text-sm text-slate-200">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="btn-primary flex items-center gap-2"
    >
      {isConnecting ? (
        <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
      ) : null}
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
