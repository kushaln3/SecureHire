"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, CREDENTIAL_VERIFIER_ABI, RPC_URL } from '@/lib/contracts';
import { Button } from '@/components/ui/button';
import { encodeProofForContract } from '@eternity-id/identity-vault';
import { useUniversities } from '@/lib/hooks/useUniversities';

interface Course {
  groupId: number;
  name: string;
  code: string;
}

export default function VerifyPortal() {
  const [selectedUniAddr, setSelectedUniAddr] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [proofJson, setProofJson] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedNullifier, setVerifiedNullifier] = useState('');

  const { universities } = useUniversities();
  const selectedUniCourses = universities.find(u => u.address === selectedUniAddr)?.courses ?? [];

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !proofJson) return alert("Please select a credential and paste proof");
    
    // Check if MetaMask is installed since verifyCredential modifies state (marks nullifier as used)
    if (!window.ethereum) return alert("Please install MetaMask to verify (requires gas for on-chain state)");
    
    setIsVerifying(true);
    setResult(null);
    setErrorMsg("");
    
    try {
      const parsedProof = JSON.parse(proofJson);
      
      if (!parsedProof || typeof parsedProof !== 'object') {
        throw new Error("Invalid proof format: not a JSON object");
      }

      // Ensure the proof matches the selected group
      if (Number(parsedProof.groupId) !== selectedGroup) {
        throw new Error("Proof does not match the selected course requirement.");
      }

      const formattedProof = encodeProofForContract(parsedProof);
      
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      
      // Call CredentialVerifier contract
      const contract = new ethers.Contract(CONTRACTS.credentialVerifier, CREDENTIAL_VERIFIER_ABI, signer);
      
      // Verify
      const tx = await contract.verifyCredential(formattedProof, selectedGroup);
      await tx.wait();
      
      setVerifiedNullifier(parsedProof.nullifier);
      setResult('success');
      setProofJson("");
      
    } catch (err: any) {
      console.error(err);
      setResult('error');
      
      if (err instanceof SyntaxError) {
        setErrorMsg("Invalid JSON format.");
      } else if (err.reason) {
        setErrorMsg(`Contract Revert: ${err.reason}`);
      } else {
        setErrorMsg(err.message || "Failed to verify cryptographic proof.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 animate-in fade-in duration-1000">
      <header className="mb-12 text-center space-y-4">
        <h1 className="text-4xl font-serif font-bold text-slate-100">Employer Verification</h1>
        <p className="text-slate-400 font-serif italic max-w-2xl mx-auto">
          Instantly verify applicant credentials directly on the Ethereum blockchain via Zero-Knowledge proofs. Zero data exposure.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Input Section */}
        <div className="p-8 border border-slate-800 bg-slate-900/50">
          <h2 className="text-2xl font-serif font-bold text-slate-200 mb-6">Verify Cryptographic Proof</h2>
          <form className="space-y-6" onSubmit={handleVerify}>
            {/* University */}
            <div>
              <label className="block text-sm font-serif font-medium text-slate-300 mb-2">1. Issuing Institution</label>
              <select
                style={{ width: '100%', backgroundColor: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', color: '#f1f5f9', outline: 'none' }}
                value={selectedUniAddr}
                onChange={e => { setSelectedUniAddr(e.target.value); setSelectedGroup(null); }}
                required
              >
                <option value="" disabled>-- Select Institution --</option>
                {universities.map(u => (
                  <option key={u.address} value={u.address}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-serif font-medium text-slate-300 mb-2">2. Required Course Credential</label>
              <select
                style={{ width: '100%', backgroundColor: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', color: selectedUniAddr ? '#f1f5f9' : '#334155', outline: 'none' }}
                value={selectedGroup ?? ''}
                onChange={e => setSelectedGroup(Number(e.target.value))}
                disabled={!selectedUniAddr || selectedUniCourses.length === 0}
                required
              >
                <option value="" disabled>
                  {!selectedUniAddr ? '← Select institution first' : selectedUniCourses.length === 0 ? 'No courses' : '-- Select Course --'}
                </option>
                {selectedUniCourses.map(c => (
                  <option key={c.groupId} value={c.groupId}>{c.code}: {c.name}</option>
                ))}
              </select>
            </div>

            
            <div>
              <label className="block text-sm font-serif font-medium text-slate-300 mb-2">Paste Proof JSON (From Applicant)</label>
              <textarea 
                className="w-full h-48 bg-slate-950 border border-slate-800 px-4 py-3 text-slate-100 font-mono text-xs focus:outline-none"
                placeholder='{"groupId": 123, "merkleTreeRoot": "...", "points": [...]}'
                value={proofJson}
                onChange={(e) => setProofJson(e.target.value)}
                required
              ></textarea>
            </div>
            <Button 
              type="submit" 
              className="w-full"
              isLoading={isVerifying}
            >
              {isVerifying ? 'Verifying on-chain...' : 'Execute On-Chain Verification'}
            </Button>
          </form>
        </div>

        {/* Result Section */}
        <div>
          {result === 'success' && (
            <div className="p-8 border border-slate-700 bg-slate-800/40 animate-in zoom-in duration-500">
              <div className="flex items-center gap-4 mb-8 border-b border-slate-700 pb-6">
                <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-slate-900 text-3xl font-serif">
                  ✓
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold text-slate-100">Proof Validated</h3>
                  <p className="text-slate-400 font-serif italic text-sm">Zero-Knowledge Verification Passed</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 tracking-wider font-mono">WHAT YOU KNOW</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-2 text-sm text-slate-200 font-serif">
                      <span className="text-slate-100 font-sans">✓</span> Passed Requirement
                    </li>
                    <li className="flex gap-2 text-sm text-slate-200 font-serif">
                      <span className="text-slate-100 font-sans">✓</span> Authentic Issuer
                    </li>
                    <li className="flex gap-2 text-sm text-slate-200 font-serif">
                      <span className="text-slate-100 font-sans">✓</span> Groth16 ZK Valid
                    </li>
                    <li className="flex gap-2 text-sm text-slate-200 font-serif">
                      <span className="text-slate-100 font-sans">✓</span> Replay Protected
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 tracking-wider font-mono">WHAT REMAINS PRIVATE</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-2 text-sm text-slate-400 font-serif">
                      <span className="text-slate-600 font-sans">🔒</span> Applicant Identity
                    </li>
                    <li className="flex gap-2 text-sm text-slate-400 font-serif">
                      <span className="text-slate-600 font-sans">🔒</span> Wallet Address
                    </li>
                    <li className="flex gap-2 text-sm text-slate-400 font-serif">
                      <span className="text-slate-600 font-sans">🔒</span> Full Transcript
                    </li>
                    <li className="flex gap-2 text-sm text-slate-400 font-serif">
                      <span className="text-slate-600 font-sans">🔒</span> Other Credentials
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-12 pt-6 border-t border-slate-700">
                <div className="text-xs text-slate-500 font-mono break-all">
                  Nullifier Hash:<br/> {verifiedNullifier}
                </div>
                <div className="text-xs text-slate-400 font-serif italic mt-4">
                  Verified at: {new Date().toLocaleTimeString()} via Sepolia
                </div>
              </div>
            </div>
          )}

          {result === 'error' && (
            <div className="p-8 border border-red-900/50 bg-red-950/20 text-center animate-in zoom-in duration-500">
              <div className="w-16 h-16 mx-auto bg-red-900/50 border border-red-500/30 flex items-center justify-center text-red-400 text-3xl font-serif mb-6">
                ✕
              </div>
              <h3 className="text-2xl font-serif font-bold text-red-400 mb-4">Invalid or Reused Proof</h3>
              <p className="text-red-400/80 font-serif italic text-sm mb-4">
                The zero-knowledge proof could not be cryptographically verified, or the nullifier has already been consumed (replay attack).
              </p>
              <div className="text-xs text-red-300 font-mono bg-red-950 border border-red-900 p-4 rounded-none text-left break-all">
                Error: {errorMsg}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
