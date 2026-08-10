"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, CREDENTIAL_ISSUER_ABI, COURSE_REGISTRY_ABI, RPC_URL } from '@/lib/contracts';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';

import {
  createPQAccount,
  deriveIdentitySeed,
  createIdentityFromSeed,
  getCommitment,
  generateCredentialProof
} from '@eternity-id/identity-vault';
import { Identity } from '@semaphore-protocol/identity';
import { useUniversities } from '@/lib/hooks/useUniversities';

interface Credential {
  groupId: number;
  courseName: string;
  courseCode: string;
  universityAddress: string;
}

export default function StudentPortal() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [pqKey, setPqKey] = useState<string>('');
  
  const [isGeneratingIdentity, setIsGeneratingIdentity] = useState(false);
  
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);

  const [selectedUniAddr, setSelectedUniAddr] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [jobId, setJobId] = useState('');
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [proofResult, setProofResult] = useState<any>(null);

  const { universities } = useUniversities();

  // Courses for the selected university
  const selectedUniCourses = universities.find(u => u.address === selectedUniAddr)?.courses ?? [];

  // Load from local storage on mount
  useEffect(() => {
    const savedSeed = localStorage.getItem('eternity_student_seed');
    const savedPq = localStorage.getItem('eternity_student_pq');
    if (savedSeed && savedPq) {
      const id = createIdentityFromSeed(savedSeed);
      setIdentity(id);
      setPqKey(savedPq);
      fetchCredentials(id);
    }
  }, []);

  const handleGenerateIdentity = async () => {
    setIsGeneratingIdentity(true);
    try {
      const account = await createPQAccount();
      const seed = deriveIdentitySeed(account.publicKey);
      const newIdentity = createIdentityFromSeed(seed);
      
      localStorage.setItem('eternity_student_seed', seed);
      localStorage.setItem('eternity_student_pq', account.publicKey);
      
      setIdentity(newIdentity);
      setPqKey(account.publicKey);
      fetchCredentials(newIdentity);
    } catch (err) {
      console.error(err);
      alert("Failed to generate quantum-safe identity.");
    } finally {
      setIsGeneratingIdentity(false);
    }
  };

  const fetchCredentials = async (id: Identity) => {
    setLoadingCreds(true);
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const issuerContract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, provider);
      const registryContract = new ethers.Contract(CONTRACTS.courseRegistry, COURSE_REGISTRY_ABI, provider);
      
      // Filter CredentialIssued events for this specific commitment
      const commitment = getCommitment(id);
      const filter = issuerContract.filters.CredentialIssued(null, commitment);
      const events = await issuerContract.queryFilter(filter, -49000);
      
      const creds: Credential[] = [];
      for (const event of events) {
        if ('args' in event) {
          const groupId = Number(event.args[0]);
          const courseData = await registryContract.getCourse(groupId);
          creds.push({
            groupId,
            courseName: courseData[0],
            courseCode: courseData[1],
            universityAddress: courseData[3]
          });
        }
      }
      setCredentials(creds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCreds(false);
    }
  };

  const handleGenerateProof = async () => {
    if (!identity || !selectedGroup || !jobId) return alert("Missing fields");
    setIsGeneratingProof(true);
    try {
      // 1. Fetch all members of this group to build the local Merkle Tree
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const issuerContract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, provider);
      
      const filter = issuerContract.filters.CredentialIssued(selectedGroup, null);
      const events = await issuerContract.queryFilter(filter, -49000);
      
      const members: bigint[] = events
        .filter(e => 'args' in e)
        .map(e => (e as any).args[1]);
        
      if (members.length === 0) throw new Error("No members found in group");

      // 2. Generate Proof via the SDK
      const proof = await generateCredentialProof(identity, selectedGroup, members, jobId);
      setProofResult(proof);
      
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Proof generation failed");
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('eternity_student_seed');
    localStorage.removeItem('eternity_student_pq');
    setIdentity(null);
    setPqKey('');
    setCredentials([]);
    setProofResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-1000 py-12">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-100 mb-2">Student Identity Vault</h1>
          <p className="text-slate-400 font-serif italic">Manage your quantum-safe identity and generate zero-knowledge proofs.</p>
        </div>
        {identity && (
          <Button variant="outline" onClick={handleLogout} size="sm">Clear Local Data</Button>
        )}
      </header>

      {/* Identity Management */}
      <section className="p-8 border border-slate-800 bg-slate-900/50">
        <h2 className="text-2xl font-serif font-bold text-slate-200 mb-6">1. Your Cryptographic Identity</h2>
        
        {!identity ? (
          <div className="text-center py-8">
            <Button 
              onClick={handleGenerateIdentity}
              isLoading={isGeneratingIdentity}
              size="lg"
            >
              Generate Post-Quantum Identity
            </Button>
            <p className="text-sm text-slate-500 font-serif italic mt-4">
              Generates a Dilithium keypair and derives a Semaphore v4 seed. Stored entirely locally.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-serif text-slate-400">Post-Quantum Public Key (Dilithium)</label>
              </div>
              <div className="font-mono text-xs text-slate-300 break-all bg-slate-950 border border-slate-800 p-4">
                {pqKey}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-serif text-slate-400">Zero-Knowledge Identity Commitment</label>
                <button 
                  className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  onClick={() => navigator.clipboard.writeText(getCommitment(identity))}
                >
                  Copy to Clipboard
                </button>
              </div>
              <div className="font-mono text-sm text-slate-100 break-all bg-slate-950 border border-slate-800 p-4">
                {getCommitment(identity)}
              </div>
              <p className="text-sm text-slate-500 font-serif italic mt-2">
                Provide this commitment to your university to receive a credential.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Credentials */}
      {identity && (
        <section className="p-8 border border-slate-800 bg-slate-900/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-slate-200">2. My Credentials</h2>
            <Button variant="outline" size="sm" onClick={() => fetchCredentials(identity)} isLoading={loadingCreds}>
              Refresh
            </Button>
          </div>
          
          {loadingCreds ? (
            <p className="text-slate-500 font-serif italic py-4">Querying blockchain for credentials...</p>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8 bg-slate-950 border border-slate-800 text-slate-400 font-serif italic">
              No credentials found on-chain.
            </div>
          ) : (
            <div className="space-y-3">
              {credentials.map(c => (
                <div key={c.groupId} className="p-4 bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-200">{c.courseCode}: {c.courseName}</h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">Issued by: {c.universityAddress}</p>
                  </div>
                  <div className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold">
                    Group ID: {c.groupId}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Proof Generation */}
      {identity && universities.length > 0 && (
        <section className="p-8 border border-slate-800 bg-slate-900/50">
          <h2 className="text-2xl font-serif font-bold text-slate-200 mb-6">3. Generate Zero-Knowledge Proof</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            {/* Step 1: Pick university */}
            <div>
              <label className="block text-sm font-serif text-slate-400 mb-2">1. Select University</label>
              <select
                style={{ width: '100%', backgroundColor: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', color: '#f1f5f9', outline: 'none' }}
                value={selectedUniAddr}
                onChange={e => { setSelectedUniAddr(e.target.value); setSelectedGroup(null); }}
              >
                <option value="" disabled>-- Select Institution --</option>
                {universities.map(u => (
                  <option key={u.address} value={u.address}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Step 2: Pick course from that university */}
            <div>
              <label className="block text-sm font-serif text-slate-400 mb-2">2. Select Course</label>
              <select
                style={{ width: '100%', backgroundColor: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', color: selectedUniAddr ? '#f1f5f9' : '#334155', outline: 'none' }}
                value={selectedGroup ?? ''}
                onChange={e => setSelectedGroup(Number(e.target.value))}
                disabled={!selectedUniAddr || selectedUniCourses.length === 0}
              >
                <option value="" disabled>
                  {!selectedUniAddr ? '← Pick university first' : selectedUniCourses.length === 0 ? 'No courses yet' : '-- Select Course --'}
                </option>
                {selectedUniCourses.map(c => (
                  <option key={c.groupId} value={c.groupId}>{c.code}: {c.name}</option>
                ))}
              </select>
            </div>

            {/* Step 3: Job ID */}
            <div>
              <label className="block text-sm font-serif text-slate-400 mb-2">3. Job / Application ID (Scope)</label>
              <input
                type="text"
                value={jobId}
                onChange={e => setJobId(e.target.value)}
                style={{ width: '100%', backgroundColor: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', color: '#f1f5f9', outline: 'none', fontFamily: 'monospace', fontSize: '0.875rem', boxSizing: 'border-box' }}
                placeholder="e.g. GOOG-SWE-2026"
              />
            </div>
          </div>

          
          <Button 
            className="w-full mb-8"
            onClick={handleGenerateProof}
            isLoading={isGeneratingProof}
            disabled={!selectedGroup || !jobId}
          >
            {isGeneratingProof ? "Constructing Merkle Tree & Generating Proof..." : "Generate Cryptographic Proof"}
          </Button>
          
          {proofResult && (
            <div className="mt-8 pt-8 border-t border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif font-bold text-slate-200">Proof Payload</h3>
                <button 
                  className="text-xs text-slate-400 hover:text-white"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(proofResult, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2))}
                >
                  Copy JSON
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2">
                  <pre className="text-xs text-slate-400 font-mono bg-slate-950 border border-slate-800 p-4 overflow-x-auto max-h-64">
                    {JSON.stringify(proofResult, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)}
                  </pre>
                </div>
                <div className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800">
                  <div className="bg-white p-2 mb-4">
                    <QRCodeSVG value={JSON.stringify(proofResult, (key, value) => typeof value === 'bigint' ? value.toString() : value)} size={150} />
                  </div>
                  <span className="text-xs font-serif text-slate-400 text-center">Scan with Verifier App or copy JSON to Employer Portal</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
