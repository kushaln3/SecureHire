"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, CREDENTIAL_ISSUER_ABI, COURSE_REGISTRY_ABI } from '@/lib/contracts';
import { Button } from '@/components/ui/button';
import { generateCredentialProof } from '@eternity-id/identity-vault'; 
// Note: We use identity-vault indirectly via the smart contracts here, proof generation is for the student.

interface Course {
  groupId: number;
  name: string;
  code: string;
  active: boolean;
}

export default function UniversityDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [creating, setCreating] = useState(false);
  
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [studentCommitment, setStudentCommitment] = useState("");
  const [issuing, setIssuing] = useState(false);
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [universityName, setUniversityName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthorization();
    
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = () => {
        checkAuthorization();
      };
      (window.ethereum as any).on('accountsChanged', handleAccountsChanged);
      return () => {
        (window.ethereum as any).removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const checkAuthorization = async () => {
    try {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) return;
      
      const signer = accounts[0];
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, provider);
      
      const info = await contract.getUniversity(signer.address);
      if (info.approved) {
        setIsAuthorized(true);
        setUniversityName(info.name);
        await fetchCourses(provider, signer.address);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async (provider: ethers.BrowserProvider, universityAddress: string) => {
    try {
      const registry = new ethers.Contract(CONTRACTS.courseRegistry, COURSE_REGISTRY_ABI, provider);
      // In a real app, we'd index this properly. For hackathon, we fetch all and filter.
      const groupIds = await registry.getAllGroupIds();
      
      const fetchedCourses: Course[] = [];
      for (const id of groupIds) {
        const c = await registry.getCourse(id);
        // c = [name, code, groupId, universityAddress, active]
        if (c[3].toLowerCase() === universityAddress.toLowerCase()) {
          fetchedCourses.push({
            name: c[0],
            code: c[1],
            groupId: Number(c[2]),
            active: c[4]
          });
        }
      }
      setCourses(fetchedCourses);
      // fetch student counts in parallel after courses are set
      await fetchCourseStudentCounts(provider, fetchedCourses);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.ethereum) return;
    setCreating(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, signer);
      
      const tx = await contract.createCourse(courseName, courseCode);
      await tx.wait();
      
      setCourseName("");
      setCourseCode("");
      alert("Course successfully created on-chain!");
      await fetchCourses(provider, signer.address);
    } catch (err: any) {
      console.error(err);
      alert("Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !studentCommitment) return alert("Select course and enter commitment");
    if (!window.ethereum) return;
    setIssuing(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, signer);
      
      const tx = await contract.issueCredential(selectedGroup, studentCommitment);
      await tx.wait();
      
      setStudentCommitment("");
      alert("Credential successfully issued to student!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to issue credential");
    } finally {
      setIssuing(false);
    }
  };

  const fetchCourseStudentCounts = async (provider: ethers.BrowserProvider, fetchedCourses: Course[]) => {
    try {
      const issuer = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, provider);
      const updated = await Promise.all(
        fetchedCourses.map(async (c) => {
          const count = await issuer.credentialCount(c.groupId);
          return { ...c, studentCount: Number(count) };
        })
      );
      setCourses(updated);
    } catch (err) {
      console.error('Failed to fetch student counts', err);
    }
  };

  if (loading) return <div className="text-center py-24 text-slate-400 font-serif">Verifying permissions...</div>;
  
  if (!isAuthorized) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-serif text-slate-200 mb-4">Unauthorized Access</h2>
        <p className="text-slate-400">You must be an approved University to view this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 animate-in fade-in duration-1000">
      <header className="mb-12">
        <h1 className="text-4xl font-serif font-bold text-slate-100 mb-2">
          {universityName ? `${universityName} Dashboard` : "University Dashboard"}
        </h1>
        <p className="text-slate-400 font-serif italic">Manage your active courses and issue secure credentials.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Create Course Panel */}
        <div className="p-8 border border-slate-800 bg-slate-900/50">
          <h2 className="text-2xl font-serif font-bold text-slate-200 mb-6">Create New Course</h2>
          <form onSubmit={handleCreateCourse} className="space-y-6">
            <div>
              <label className="block text-sm font-serif text-slate-400 mb-2">Course Name</label>
              <input 
                type="text" required
                value={courseName} onChange={e => setCourseName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-4 py-3 text-slate-100 focus:outline-none focus:border-slate-500"
                placeholder="e.g. Data Structures"
              />
            </div>
            <div>
              <label className="block text-sm font-serif text-slate-400 mb-2">Course Code</label>
              <input 
                type="text" required
                value={courseCode} onChange={e => setCourseCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-4 py-3 text-slate-100 focus:outline-none focus:border-slate-500"
                placeholder="e.g. CS201"
              />
            </div>
            <Button type="submit" className="w-full" isLoading={creating}>
              Create Course Group
            </Button>
          </form>
        </div>

        {/* Issue Credential Panel */}
        <div className="p-8 border border-slate-800 bg-slate-900/50">
          <h2 className="text-2xl font-serif font-bold text-slate-200 mb-6">Issue Credential</h2>
          <form onSubmit={handleIssueCredential} className="space-y-6">
            <div>
              <label className="block text-sm font-serif text-slate-400 mb-2">Select Course</label>
              <select
                required
                value={selectedGroup || ""}
                onChange={e => setSelectedGroup(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 px-4 py-3 text-slate-100 focus:outline-none focus:border-slate-500"
              >
                <option value="" disabled>-- Select a Course --</option>
                {courses.map(c => (
                  <option key={c.groupId} value={c.groupId}>
                    {c.code}: {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-serif text-slate-400 mb-2">Student Identity Commitment</label>
              <input 
                type="text" required
                value={studentCommitment} onChange={e => setStudentCommitment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-4 py-3 text-slate-100 focus:outline-none focus:border-slate-500 font-mono text-sm"
                placeholder="e.g. 170519033..."
              />
            </div>
            <Button type="submit" className="w-full" isLoading={issuing}>
              Issue to Student
            </Button>
          </form>
        </div>
      </div>

      {/* ── Active Courses List ─────────────────────────────── */}
      <section className="border-t border-slate-800 pt-10">
        <h2 className="text-2xl font-serif font-bold text-slate-200 mb-2">Active Courses</h2>
        <p className="text-slate-500 text-sm font-serif italic mb-6">All courses registered on-chain for your institution.</p>

        {courses.length === 0 ? (
          <div className="p-10 border border-slate-800 bg-slate-900/30 text-center">
            <p className="text-slate-500 font-serif italic">No courses created yet. Use the form above to create your first course.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {courses.map(c => (
              <div
                key={c.groupId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border border-slate-800 bg-slate-900/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center border border-slate-700 bg-slate-800 text-slate-400 font-mono text-xs shrink-0">
                    {c.code.slice(0, 3)}
                  </div>
                  <div>
                    <p className="font-serif font-semibold text-slate-200">{c.name}</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{c.code} · Group #{c.groupId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-100">{(c as any).studentCount ?? '—'}</p>
                    <p className="text-xs text-slate-500">credentials issued</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${c.active ? 'bg-emerald-500' : 'bg-red-600'}`} title={c.active ? 'Active' : 'Inactive'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
