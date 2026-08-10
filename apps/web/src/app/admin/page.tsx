"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACTS, CREDENTIAL_ISSUER_ABI, RPC_URL } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/hooks/useWallet";
import { useUniversities } from "@/lib/hooks/useUniversities";

interface PendingUniversity {
  wallet: string;
  name: string;
  metadata: string;
}

export default function AdminPage() {
  const [pending, setPending] = useState<PendingUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const { address } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const { universities, loading: uniLoading } = useUniversities();

  useEffect(() => {
    let isMounted = true;
    if (address) {
      checkAdminStatus(isMounted);
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
    return () => { isMounted = false; };
  }, [address]);

  const checkAdminStatus = async (isMounted: boolean) => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, provider);
      // ethers.ZeroHash is equivalent to bytes32(0), the DEFAULT_ADMIN_ROLE
      const hasAdminRole = await contract.hasRole(ethers.ZeroHash, address);
      if (isMounted) setIsAdmin(hasAdminRole);
      
      if (hasAdminRole) {
        await fetchPending(isMounted);
      }
    } catch (err) {
      console.error(err);
      if (isMounted) setIsAdmin(false);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const fetchPending = async (isMounted: boolean = true) => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, provider);
      
      // Query RegistrationRequested events
      const filter = contract.filters.RegistrationRequested();
      const events = await contract.queryFilter(filter, -49000);
      
      const pendingList: PendingUniversity[] = [];
      
      for (const event of events) {
        if ('args' in event) {
          const wallet = event.args[0];
          // Check if it's still pending (not approved yet)
          const info = await contract.getUniversity(wallet);
          if (!info.approved) {
            pendingList.push({
              wallet,
              name: event.args[1],
              metadata: event.args[2]
            });
          }
        }
      }
      
      if (isMounted) setPending(pendingList);
    } catch (err) {
      console.error(err);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const handleApprove = async (wallet: string) => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    
    setProcessing(wallet);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, signer);
      
      const tx = await contract.approveUniversity(wallet);
      await tx.wait();
      
      alert("University approved successfully!");
      fetchPending();
    } catch (err: any) {
      console.error(err);
      alert(err.reason || "Failed to approve. Are you the MoE Admin?");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 pt-12">
      <header className="space-y-4">
        <h1 className="text-4xl font-serif font-bold text-slate-100">
          Ministry of Education
        </h1>
        <p className="text-slate-400 font-serif italic">
          Secure Administration Portal
        </p>
        <div className="h-px w-full bg-slate-800 my-8" />
      </header>

      {!address ? (
        <div className="p-8 border border-slate-800 bg-slate-900/50 text-center">
          <p className="text-slate-400 font-serif">Please connect your wallet to access the Ministry portal.</p>
        </div>
      ) : !isAdmin ? (
        <div className="p-8 border border-red-900/50 bg-red-950/20 text-center rounded-lg">
          <h2 className="text-xl font-bold text-red-400 mb-2">Restricted Access</h2>
          <p className="text-slate-300 font-serif">Your connected wallet ({address}) is not authorized as the Ministry of Education Admin.</p>
        </div>
      ) : (
        <>
          {/* ── Pending Registrations ─────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-200">Pending Registrations</h2>

            {loading ? (
              <p className="text-slate-500 font-serif italic">Querying blockchain records...</p>
            ) : pending.length === 0 ? (
              <div className="p-8 border border-slate-800 bg-slate-900/50 text-center">
                <p className="text-slate-400 font-serif">No pending university registrations found.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pending.map((u) => (
                  <div key={u.wallet} className="p-6 border border-slate-700 bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-200">{u.name}</h3>
                      <p className="text-sm text-slate-500 font-mono mt-1">{u.wallet}</p>
                      <p className="text-sm text-slate-400 mt-2">{u.metadata}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleApprove(u.wallet)}
                      isLoading={processing === u.wallet}
                    >
                      Approve Authority
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Approved Institutions Registry ───────────── */}
          <section className="space-y-6 pt-8 border-t border-slate-800">
            <h2 className="text-xl font-semibold text-slate-200">Approved Institutions</h2>
            <p className="text-slate-500 text-sm font-serif italic">All universities approved by the Ministry of Education and their active courses.</p>

            {uniLoading ? (
              <p className="text-slate-500 font-serif italic">Loading registry from blockchain...</p>
            ) : universities.length === 0 ? (
              <div className="p-8 border border-slate-800 bg-slate-900/50 text-center">
                <p className="text-slate-400 font-serif">No approved universities found yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {universities.map(uni => (
                  <details key={uni.address} className="border border-slate-800 bg-slate-900/30">
                    <summary className="px-6 py-4 cursor-pointer list-none flex justify-between items-center select-none">
                      <div>
                        <p className="font-serif font-bold text-slate-200">{uni.name}</p>
                        <p className="font-mono text-xs text-slate-600 mt-1">{uni.address}</p>
                      </div>
                      <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 border border-slate-700">
                        {uni.courses.length} course{uni.courses.length !== 1 ? 's' : ''} ▾
                      </span>
                    </summary>
                    <div className="px-6 pb-4">
                      {uni.courses.length === 0 ? (
                        <p className="text-slate-600 text-sm italic">No courses created yet.</p>
                      ) : (
                        <div className="flex flex-col gap-2 mt-2">
                          {uni.courses.map(c => (
                            <div key={c.groupId} className="flex justify-between items-center px-4 py-2 bg-slate-950/50 border border-slate-800">
                              <div>
                                <span className="font-mono text-xs font-semibold text-slate-400">{c.code}</span>
                                <span className="text-slate-600 mx-2">—</span>
                                <span className="text-slate-300 text-sm">{c.name}</span>
                              </div>
                              <span className="font-mono text-xs text-slate-600">Group #{c.groupId}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
