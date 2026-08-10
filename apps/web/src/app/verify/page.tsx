"use client";
import { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, CREDENTIAL_VERIFIER_ABI } from '@/lib/contracts';
import { Button } from '@/components/ui/button';
import { encodeProofForContract } from '@eternity-id/identity-vault';
import { useUniversities } from '@/lib/hooks/useUniversities';


export default function VerifyPortal() {
  const [selectedUniAddr, setSelectedUniAddr] = useState('');
  const [expectedGroupIds, setExpectedGroupIds] = useState<number[]>([]);
  const [proofJson, setProofJson] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State for bundle results
  const [bundleResults, setBundleResults] = useState<{groupId: number, courseName: string, valid: boolean, missing?: boolean}[]>([]);

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
    
    try {
      const parsedProof = JSON.parse(proofJson);
      
      if (!parsedProof || typeof parsedProof !== 'object') {
        throw new Error("Invalid proof format: not a JSON object");
      }

      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACTS.credentialVerifier, CREDENTIAL_VERIFIER_ABI, signer);

      let proofsToVerify = [];

      if (parsedProof.version === 'bundle-v1' && Array.isArray(parsedProof.proofs)) {
        if (expectedGroupIds.length > 0) {
          proofsToVerify = parsedProof.proofs.filter((p: any) => expectedGroupIds.includes(Number(p.groupId || p.scope)));
        } else {
          proofsToVerify = parsedProof.proofs;
        }
      } else {
        const pGrpId = Number(parsedProof.groupId || parsedProof.scope);
        if (expectedGroupIds.length > 0 && !expectedGroupIds.includes(pGrpId)) {
          throw new Error(`Proof provided is for Group ${pGrpId}, which is not in your required list.`);
        }
        proofsToVerify = [parsedProof];
      }

      if (proofsToVerify.length === 0) {
        throw new Error("No proofs found in the provided JSON that match your required credentials.");
      }

      const groupIds = proofsToVerify.map((p: any) => BigInt(p.groupId || p.scope));
      const formattedProofs = proofsToVerify.map((p: any) => encodeProofForContract(p));
      
      let boolResults: boolean[];
      try {
        boolResults = await contract.verifyBatch.staticCall(formattedProofs, groupIds);
      } catch (staticErr) {
        console.error("Static call failed:", staticErr);
        throw new Error("One or more proofs are cryptographically invalid or already used.");
      }
      
      // -- KOHAKU INTEGRATION --
      // Dynamic import bypasses Next.js static analysis so the build succeeds
      // even if @kohaku-eth/provider is not available in the build environment.
      // Falls back to a plain ethers sendTransaction if the package isn't found.
      const payload = contract.interface.encodeFunctionData("verifyBatch", [formattedProofs, groupIds]);
      let txHash: string;
      try {
        const getProvider = new Function("return import('@kohaku-eth/provider')");
        const getEthers = new Function("return import('@kohaku-eth/provider/ethers')");
        const [kohakuProvider, kohakuEthers] = await Promise.all([getProvider(), getEthers()]);
        const { createTx } = kohakuProvider;
        const { EthersSignerAdapter } = kohakuEthers;
        const tx = createTx(CONTRACTS.credentialVerifier, payload);
        const kohakuSigner = new EthersSignerAdapter(signer as any);
        txHash = await kohakuSigner.sendTransaction(tx);
      } catch {
        // Kohaku provider not available — fall back to standard ethers
        console.warn("@kohaku-eth/provider not available, using ethers fallback");
        const tx = await signer.sendTransaction({
          to: CONTRACTS.credentialVerifier,
          data: payload,
        });
        txHash = tx.hash;
      }
      // ------------------------
      
      const results: {groupId: number, courseName: string, valid: boolean, missing?: boolean}[] = proofsToVerify.map((p: any, i: number) => ({
        groupId: Number(p.groupId || p.scope),
        courseName: p.courseName || `Group ${p.groupId || p.scope}`,
        valid: boolResults[i]
      }));

      // Check for missing proofs if expectedGroupIds was specified
      const missingIds = expectedGroupIds.filter(id => !results.some(r => r.groupId === id));
      missingIds.forEach(id => {
         const course = selectedUniCourses.find(c => c.groupId === id);
         results.push({
            groupId: id,
            courseName: course ? course.name : `Group ${id}`,
            valid: false,
            missing: true
         });
      });
      
      setBundleResults(results);
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

  const isJsonBundle = () => {
    try {
      const parsed = JSON.parse(proofJson);
      return parsed.version === 'bundle-v1' && Array.isArray(parsed.proofs);
    } catch {
      return false;
    }
  };

  const toggleExpectedGroup = (gid: number) => {
    setExpectedGroupIds(prev => 
      prev.includes(gid) ? prev.filter(g => g !== gid) : [...prev, gid]
    );
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
            
                {/* University */}
                <div>
                  <label className="block text-sm font-serif font-medium text-slate-300 mb-2">1. Issuing Institution</label>
                  <select
                    style={{ width: '100%', backgroundColor: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', color: '#f1f5f9', outline: 'none' }}
                    value={selectedUniAddr}
                    onChange={e => { setSelectedUniAddr(e.target.value); }}
                  >
                    <option value="" disabled>-- Select Institution --</option>
                    {universities.map(u => (
                      <option key={u.address} value={u.address}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Course Selection */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-serif font-medium text-slate-300">2. Required Credentials (Optional)</label>
                    <button 
                      type="button"
                      className="text-xs text-blue-400 hover:text-blue-300"
                      onClick={() => {
                        if (expectedGroupIds.length === selectedUniCourses.length) setExpectedGroupIds([]);
                        else setExpectedGroupIds(selectedUniCourses.map(c => c.groupId));
                      }}
                    >
                      {expectedGroupIds.length === selectedUniCourses.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 bg-slate-950 p-4 border border-slate-800">
                    {selectedUniCourses.length === 0 && <div className="text-xs text-slate-500 italic">{!selectedUniAddr ? '← Select institution first to set requirements' : 'No courses available'}</div>}
                    {selectedUniCourses.map(c => (
                      <label key={c.groupId} className="flex items-center gap-3 p-2 hover:bg-slate-900 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={expectedGroupIds.includes(c.groupId)}
                          onChange={() => toggleExpectedGroup(c.groupId)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-slate-200 text-sm">
                          {c.isDegree ? 'Degree: ' : 'Course: '}{c.code}: {c.name}
                        </span>
                      </label>
                    ))}
                  </div>
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
              <div className="mb-6 border-b border-slate-700 pb-4">
                <h3 className="text-xl font-serif font-bold text-slate-100">
                  Verification Results
                </h3>
              </div>
              
              <div className="mb-8">
                <div className="text-sm text-slate-300 font-mono mb-4">
                  REQUIREMENTS STATUS:
                </div>
                <ul className="space-y-2 list-disc list-inside">
                  {bundleResults.map((r, idx) => (
                    <li key={idx} className="text-sm font-serif">
                      <span className="font-semibold text-slate-200">{r.courseName}</span>
                      {' - '}
                      {r.missing ? (
                        <span className="text-red-400">Proof Not Provided</span>
                      ) : r.valid ? (
                        <span className="text-emerald-400">Successfully Verified</span>
                      ) : (
                        <span className="text-red-400">Verification Failed</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-8 mt-8 border-t border-slate-700 pt-6">
                <div>
                  <div className="text-xs font-bold text-slate-300 tracking-wider font-mono mb-3">WHAT IS PROVEN</div>
                  <ul className="space-y-2 list-disc list-inside text-sm text-slate-200 font-serif">
                    <li>Required credentials exist</li>
                    <li>Cryptographically signed by issuer</li>
                    <li>Zero-knowledge proof is valid</li>
                    <li>Replay attack prevented</li>
                  </ul>
                </div>
                
                <div>
                  <div className="text-xs font-bold text-slate-500 tracking-wider font-mono mb-3">WHAT REMAINS PRIVATE</div>
                  <ul className="space-y-2 list-disc list-inside text-sm text-slate-400 font-serif">
                    <li>Applicant Identity</li>
                    <li>Wallet Address</li>
                    <li>Full Transcript</li>
                    <li>Other Credentials</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {result === 'error' && (
            <div className="p-8 border border-red-900/50 bg-red-950/20 text-center animate-in zoom-in duration-500">
              <h3 className="text-xl font-serif font-bold text-red-400 mb-4">Verification Error</h3>
              <p className="text-red-400/80 font-serif text-sm mb-4">
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
