"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { CONTRACTS, CREDENTIAL_ISSUER_ABI } from '@/lib/contracts';
import { Button } from '@/components/ui/button';

export default function UniversityGateway() {
  const [walletStatus, setWalletStatus] = useState<'loading' | 'approved' | 'pending' | 'none'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [metadata, setMetadata] = useState('');

  useEffect(() => {
    checkStatus();
    
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = () => {
        checkStatus();
      };
      (window.ethereum as any).on('accountsChanged', handleAccountsChanged);
      return () => {
        (window.ethereum as any).removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const checkStatus = async () => {
    try {
      if (!window.ethereum) return setWalletStatus('none');
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) return setWalletStatus('none');

      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, provider);
      const info = await contract.getUniversity(accounts[0].address);

      if (info.approved) setWalletStatus('approved');
      else if (Number(info.registeredAt) > 0) setWalletStatus('pending');
      else setWalletStatus('none');
    } catch (err) {
      console.error(err);
      setWalletStatus('none');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.ethereum) return alert('Please install MetaMask');
    setIsSubmitting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, signer);
      const tx = await contract.requestRegistration(name, metadata);
      await tx.wait();
      setWalletStatus('pending');
    } catch (err: any) {
      console.error(err);
      alert(err.reason || 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 space-y-16 animate-in fade-in duration-1000">

      {/* ── My Status ───────────────────────────────────────── */}
      <section>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
          University Portal
        </h1>
        <p style={{ color: '#64748b', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', marginBottom: '3rem' }}>
          Register your institution or manage issued credentials.
        </p>

        {walletStatus === 'loading' && (
          <p style={{ color: '#475569', fontStyle: 'italic' }}>Checking wallet status...</p>
        )}

        {walletStatus === 'approved' && (
          <div style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                Your institution is approved ✓
              </p>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>You can now create courses and issue credentials.</p>
            </div>
            <Link href="/university/dashboard">
              <Button size="lg">Open Dashboard</Button>
            </Link>
          </div>
        )}

        {walletStatus === 'pending' && (
          <div style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              Registration Pending
            </p>
            <p style={{ color: '#475569', fontSize: '0.875rem' }}>
              The Ministry of Education will review your application. Check back soon.
            </p>
          </div>
        )}

        {walletStatus === 'none' && (
          <div style={{ maxWidth: '32rem' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '2rem' }}>
              Apply for Registration
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem', fontFamily: "'Playfair Display', serif" }}>
                  Institution Name
                </label>
                <input
                  type="text" required value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="e.g. Indian Institute of Technology, Guwahati"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem', fontFamily: "'Playfair Display', serif" }}>
                  Department / Public Metadata
                </label>
                <input
                  type="text" value={metadata}
                  onChange={e => setMetadata(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="e.g. Department of Computer Science"
                />
              </div>
              <Button type="submit" isLoading={isSubmitting}>
                Submit to Ministry of Education
              </Button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
