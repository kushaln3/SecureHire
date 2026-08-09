'use client';
import { useState } from 'react';
import GlassCard from '../../components/GlassCard';

export default function VerifyPortal() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setResult('success');
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Employer Verification</h1>
        <p className="text-slate-400">Instantly verify applicant credentials without seeing their private data.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <GlassCard className="h-fit border-indigo-500/20">
          <h2 className="text-xl font-bold text-white mb-6">Verify a Proof</h2>
          <form className="space-y-6" onSubmit={handleVerify}>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Required Course Credential</label>
              <select className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500">
                <option>DSAI Minor (CS201)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Job Application ID</label>
              <input 
                type="text" 
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. GOOG-SWE-2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Paste Proof JSON</label>
              <textarea 
                className="w-full h-32 bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                placeholder='{"proof": {...}}'
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={isVerifying}
              className="btn-primary w-full flex justify-center items-center gap-2"
            >
              {isVerifying ? <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div> : null}
              {isVerifying ? 'Verifying on-chain...' : 'Verify Credential'}
            </button>
          </form>
        </GlassCard>

        {/* Result Section */}
        <div>
          {result === 'success' && (
            <div className="glass p-8 border-emerald-500/50 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-3xl">
                  ✓
                </div>
                <div>
                  <h3 className="text-2xl font-black text-emerald-400">Proof Validated</h3>
                  <p className="text-emerald-500/80 text-sm font-medium">Zero-Knowledge Verification Passed</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 relative z-10">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-emerald-400 tracking-wider">WHAT YOU KNOW</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-2 text-sm text-slate-200">
                      <span className="text-emerald-500">✓</span> Passed: DSAI Minor
                    </li>
                    <li className="flex gap-2 text-sm text-slate-200">
                      <span className="text-emerald-500">✓</span> Issued by: IIT Guwahati
                    </li>
                    <li className="flex gap-2 text-sm text-slate-200">
                      <span className="text-emerald-500">✓</span> ZK Proof: Valid (Groth16)
                    </li>
                    <li className="flex gap-2 text-sm text-slate-200">
                      <span className="text-emerald-500">✓</span> Replay Protected
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 tracking-wider">WHAT REMAINS PRIVATE</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-2 text-sm text-slate-400">
                      <span className="text-slate-600">🔒</span> Student Identity
                    </li>
                    <li className="flex gap-2 text-sm text-slate-400">
                      <span className="text-slate-600">🔒</span> Wallet Address
                    </li>
                    <li className="flex gap-2 text-sm text-slate-400">
                      <span className="text-slate-600">🔒</span> Full Transcript
                    </li>
                    <li className="flex gap-2 text-sm text-slate-400">
                      <span className="text-slate-600">🔒</span> Other Credentials
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                <div className="text-xs text-slate-500 font-mono">
                  Nullifier: 0xabc...123 <br/>
                  Verified at: {new Date().toLocaleTimeString()}
                </div>
                <div className="text-[10px] text-slate-600 font-semibold text-right">
                  Powered by Semaphore v4<br/>+ Ethereum Sepolia
                </div>
              </div>
            </div>
          )}

          {result === 'error' && (
            <div className="glass p-8 border-red-500/50 bg-red-500/5 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-3xl mb-4">
                ✕
              </div>
              <h3 className="text-2xl font-bold text-red-400 mb-2">Invalid Proof</h3>
              <p className="text-red-500/80 text-sm">The zero-knowledge proof could not be cryptographically verified or has been reused.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
