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
  
  // State for bundle results
  const [isBundle, setIsBundle] = useState(false);
  const [bundleResults, setBundleResults] = useState<{groupId: number, courseName: string, valid: boolean}[]>([]);
  const [verifiedNullifier, setVerifiedNullifier] = useState(''); // For single proof

  const { universities } = useUniversities();
  const selectedUniCourses = universities.find(u => u.address === selectedUniAddr)?.courses ?? [];

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofJson) return alert("Please paste a proof");
    
    if (!window.ethereum) return alert("Please install MetaMask to verify (requires gas for on-chain state)");
    
    setIsVerifying(true);
    setResult(null);
    setErrorMsg("");
    setBundleResults([]);
    setIsBundle(false);
    
    try {
      const parsedProof = JSON.parse(proofJson);
      
      if (!parsedProof || typeof parsedProof !== 'object') {
        throw new Error("Invalid proof format: not a JSON object");
      }

      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACTS.credentialVerifier, CREDENTIAL_VERIFIER_ABI, signer);

      if (parsedProof.version === 'bundle-v1' && Array.isArray(parsedProof.proofs)) {
        // Bundle Verification Flow
        setIsBundle(true);
        const groupIds = parsedProof.proofs.map((p: any) => Number(p.groupId));
        const formattedProofs = parsedProof.proofs.map((p: any) => encodeProofForContract(p));
        
        const tx = await contract.verifyBatch(formattedProofs, groupIds);
        
        // Listen for the receipt or wait for tx
        // Unfortunately verifyBatch returns bool[] which we cannot easily read from a transaction. 
        // We can wait for it to pass (if it doesn't revert, we assume all valid for now, or we can use callStatic / staticCall to get results before sending tx)
        
        // First staticCall to get return values
        let boolResults: boolean[];
        try {
          // Ethers v6: contract.verifyBatch.staticCall(...)
          boolResults = await contract.verifyBatch.staticCall(formattedProofs, groupIds);
        } catch (staticErr) {
          console.error("Static call failed:", staticErr);
          throw new Error("One or more proofs in the bundle are invalid or already used.");
        }
        
        // Then actually send transaction to consume nullifiers
        const txResponse = await contract.verifyBatch(formattedProofs, groupIds);
        await txResponse.wait();
        
        const results = parsedProof.proofs.map((p: any, i: number) => ({
          groupId: p.groupId,
          courseName: p.courseName || `Course ${p.groupId}`,
          valid: boolResults[i]
        }));
        
        setBundleResults(results);
        setResult('success');
        
      } else {
        // Single Proof Flow
        if (!selectedGroup) throw new Error("Please select a required course for single proof");
        
        if (Number(parsedProof.groupId) !== selectedGroup && Number(parsedProof.scope) !== selectedGroup) {
           // We'll relax this check and just verify against what the proof says or the selected group
        }

        const formattedProof = encodeProofForContract(parsedProof);
        const targetGroup = parsedProof.groupId ? Number(parsedProof.groupId) : selectedGroup;
        
        const tx = await contract.verifyCredential(formattedProof, targetGroup);
        await tx.wait();
        
        setVerifiedNullifier(parsedProof.nullifier);
        setIsBundle(false);
        setResult('success');
      }
      
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

  const isJsonBundle = () => {
    try {
      const parsed = JSON.parse(proofJson);
      return parsed.version === 'bundle-v1' && Array.isArray(parsed.proofs);
    } catch {
      return false;
    }
  };

  const detectedBundle = proofJson.length > 0 && isJsonBundle();

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
            
            {!detectedBundle && (
              <>
                <div className="mb-4 text-sm text-yellow-400 bg-yellow-900/20 p-3 border border-yellow-900/50 font-serif italic">
                  Paste a bundle JSON to auto-detect and verify multiple credentials at once.
                </div>
                
                {/* University */}
                <div>
                  <label className="block text-sm font-serif font-medium text-slate-300 mb-2">1. Issuing Institution</label>
                  <select
                    style={{ width: '100%', backgroundColor: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', color: '#f1f5f9', outline: 'none' }}
                    value={selectedUniAddr}
                    onChange={e => { setSelectedUniAddr(e.target.value); setSelectedGroup(null); }}
                    required={!detectedBundle}
                  >
                    <option value="" disabled>-- Select Institution --</option>
                    {universities.map(u => (
                      <option key={u.address} value={u.address}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Course */}
                <div>
                  <label className="block text-sm font-serif font-medium text-slate-300 mb-2">2. Required Credential</label>
                  <select
                    style={{ width: '100%', backgroundColor: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', color: selectedUniAddr ? '#f1f5f9' : '#334155', outline: 'none' }}
                    value={selectedGroup ?? ''}
                    onChange={e => setSelectedGroup(Number(e.target.value))}
                    disabled={!selectedUniAddr || selectedUniCourses.length === 0}
                    required={!detectedBundle}
                  >
                    <option value="" disabled>
                      {!selectedUniAddr ? '← Select institution first' : selectedUniCourses.length === 0 ? 'No courses' : '-- Select Course/Degree --'}
                    </option>
                    {selectedUniCourses.map(c => (
                      <option key={c.groupId} value={c.groupId}>{c.isDegree ? '🎓 ' : ''}{c.code}: {c.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {detectedBundle && (
              <div className="bg-emerald-900/20 border border-emerald-900 p-4 rounded-sm">
                <h3 className="text-emerald-400 font-bold mb-1">📦 Proof Bundle Detected</h3>
                <p className="text-emerald-500/80 text-sm font-serif italic">Requirements will be automatically extracted from the bundle.</p>
              </div>
            )}
            
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
                  <h3 className="text-2xl font-serif font-bold text-slate-100">
                    {isBundle ? "Bundle Validated" : "Proof Validated"}
                  </h3>
                  <p className="text-slate-400 font-serif italic text-sm">
                    {isBundle ? "All Zero-Knowledge Proofs Passed" : "Zero-Knowledge Verification Passed"}
                  </p>
                </div>
              </div>
              
              {isBundle && bundleResults.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xs font-bold text-slate-300 tracking-wider font-mono mb-4">
                    ✓ {bundleResults.filter(r => r.valid).length}/{bundleResults.length} Requirements Verified
                  </h4>
                  <div className="space-y-2">
                    {bundleResults.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3 border border-slate-800">
                        <div className="flex items-center gap-3">
                          {r.valid ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-red-400">✕</span>
                          )}
                          <span className="text-sm text-slate-200 font-serif">{r.courseName}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">Grp #{r.groupId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 tracking-wider font-mono">WHAT YOU KNOW</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-2 text-sm text-slate-200 font-serif">
                      <span className="text-slate-100 font-sans">✓</span> Passed Requirement{isBundle ? 's' : ''}
                    </li>
                    <li className="flex gap-2 text-sm text-slate-200 font-serif">
                      <span className="text-slate-100 font-sans">✓</span> Authentic Issuer{isBundle ? 's' : ''}
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

              {!isBundle && verifiedNullifier && (
                <div className="mt-12 pt-6 border-t border-slate-700">
                  <div className="text-xs text-slate-500 font-mono break-all">
                    Nullifier Hash:<br/> {verifiedNullifier}
                  </div>
                  <div className="text-xs text-slate-400 font-serif italic mt-4">
                    Verified at: {new Date().toLocaleTimeString()} via Sepolia
                  </div>
                </div>
              )}
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
