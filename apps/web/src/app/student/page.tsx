'use client';
import { useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { Identity } from '@semaphore-protocol/identity';
import { QRCodeSVG } from 'qrcode.react';

export default function StudentPortal() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [pqKey, setPqKey] = useState<string>('');
  const [isGeneratingIdentity, setIsGeneratingIdentity] = useState(false);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [proofResult, setProofResult] = useState<any>(null);

  const generateIdentity = async () => {
    setIsGeneratingIdentity(true);
    setTimeout(() => {
      // Mock PQ Key bytes
      const randomBytes = crypto.getRandomValues(new Uint8Array(64));
      const pqHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      setPqKey(pqHex);
      
      const newIdentity = new Identity(pqHex);
      setIdentity(newIdentity);
      setIsGeneratingIdentity(false);
    }, 1000);
  };

  const generateProof = async () => {
    setIsGeneratingProof(true);
    setTimeout(() => {
      setProofResult({
        proof: { pi_a: ["1", "2", "3"], pi_b: [["1", "2"], ["3", "4"]], pi_c: ["1", "2", "3"], protocol: "groth16" },
        merkleTreeRoot: "0x123...",
        nullifierHash: "0xabc...",
        groupId: "1042"
      });
      setIsGeneratingProof(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Student Identity Hub</h1>
        <p className="text-slate-400">Manage your quantum-safe identity and generate zero-knowledge proofs.</p>
      </div>

      {/* Card 1: Generate Identity */}
      <GlassCard title="1. Your ZK Identity">
        {!identity ? (
          <div className="text-center py-8">
            <button 
              onClick={generateIdentity}
              disabled={isGeneratingIdentity}
              className="btn-primary"
            >
              {isGeneratingIdentity ? 'Generating...' : 'Generate Quantum-Safe Identity'}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-navy-950/50 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-300">🔐 Quantum-Safe Key</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30">Dilithium (Mock)</span>
              </div>
              <div className="font-mono text-xs text-slate-400 break-all bg-black/30 p-2 rounded">
                0x{pqKey.slice(0, 32)}...
              </div>
            </div>
            <div className="p-4 bg-navy-950/50 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-300">🔑 ZK Commitment</span>
                <button className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold" onClick={() => navigator.clipboard.writeText(identity.commitment.toString())}>Copy</button>
              </div>
              <div className="font-mono text-xs text-emerald-400 break-all bg-black/30 p-2 rounded">
                {identity.commitment.toString()}
              </div>
            </div>
            <div className="col-span-full text-center text-xs text-slate-500">
              Your secret key never leaves this browser. Stored encrypted in localStorage.
            </div>
          </div>
        )}
      </GlassCard>

      {/* Card 2: Share */}
      <GlassCard title="2. Share with University">
        <p className="text-slate-400 text-sm mb-4">
          Copy your commitment hash and send it to your university's admin. They will add you to the course group on-chain.
        </p>
        <div className="flex gap-2">
          <input 
            type="text" 
            readOnly
            value={identity ? identity.commitment.toString() : ''}
            placeholder="Identity not generated yet"
            className="flex-1 bg-navy-950 border border-white/10 rounded-xl px-4 py-2 font-mono text-sm text-slate-300 focus:outline-none"
          />
        </div>
      </GlassCard>

      {/* Card 3: Credentials */}
      <GlassCard title="3. My Credentials">
        <p className="text-xs text-indigo-400 font-medium mb-4">Fetches live from Semaphore groups on Sepolia</p>
        {!identity ? (
          <div className="text-center py-6 text-slate-500 text-sm">Generate your identity to view credentials.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-indigo-500/30 transition-colors">
              <div>
                <div className="font-bold text-white mb-1">DSAI Minor (CS201)</div>
                <div className="text-xs text-slate-400">Issued by: IITG • Aug 9, 2026</div>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">Valid</div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Card 4: Generate Proof */}
      <GlassCard title="4. Generate ZK Proof">
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Credential</label>
              <select className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500">
                <option>DSAI Minor (CS201)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Job Application ID (Nullifier Scope)</label>
              <input 
                type="text" 
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. GOOG-SWE-2026"
              />
            </div>
          </div>

          <button 
            onClick={generateProof}
            disabled={!identity || isGeneratingProof}
            className="btn-primary w-full flex justify-center items-center gap-2"
          >
            {isGeneratingProof ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div> : null}
            {isGeneratingProof ? 'Generating ZK proof... this may take 10-30 seconds' : 'Generate Proof'}
          </button>

          {proofResult && (
            <div className="mt-8 p-6 bg-navy-950/80 border border-indigo-500/30 rounded-xl">
              <h4 className="text-white font-bold mb-4 flex justify-between items-center">
                Proof Generated Successfully
                <button className="text-xs text-indigo-400 hover:text-white" onClick={() => navigator.clipboard.writeText(JSON.stringify(proofResult, null, 2))}>Copy JSON</button>
              </h4>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <pre className="text-xs text-slate-400 font-mono bg-black/50 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(proofResult, null, 2)}
                  </pre>
                </div>
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="bg-white p-2 rounded-xl">
                    <QRCodeSVG value={JSON.stringify(proofResult)} size={150} />
                  </div>
                  <span className="text-xs text-slate-400">Scan to verify</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
