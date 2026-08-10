"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, CREDENTIAL_ISSUER_ABI, COURSE_REGISTRY_ABI } from '@/lib/contracts';
import { Button } from '@/components/ui/button';

interface Course {
  groupId: number;
  name: string;
  code: string;
  active: boolean;
  isDegree?: boolean;
}

export default function UniversityDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMode, setCreateMode] = useState<'course' | 'degree'>('course');
  
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [studentCommitment, setStudentCommitment] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issueProgress, setIssueProgress] = useState("");
  
  const [linkDegreeGroupId, setLinkDegreeGroupId] = useState<number | null>(null);
  const [linkCourseGroupId, setLinkCourseGroupId] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);

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
      if (!window.ethereum) {
        setIsAuthorized(false);
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        setIsAuthorized(false);
        return;
      }
      
      const signer = accounts[0];
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, provider);
      
      const info = await contract.getUniversity(signer.address);
      if (info.approved) {
        setIsAuthorized(true);
        setUniversityName(info.name);
        await fetchCourses(provider, signer.address);
      } else {
        setIsAuthorized(false);
        setUniversityName("");
        setCourses([]);
      }
    } catch (err) {
      console.error(err);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async (provider: ethers.BrowserProvider, universityAddress: string) => {
    try {
      const registry = new ethers.Contract(CONTRACTS.courseRegistry, COURSE_REGISTRY_ABI, provider);
      const groupIds = await registry.getAllGroupIds();
      
      const fetchedCourses: Course[] = [];
      for (const id of groupIds) {
        const c = await registry.getCourse(id);
        if (c[3].toLowerCase() === universityAddress.toLowerCase()) {
          fetchedCourses.push({
            name: c[0],
            code: c[1],
            groupId: Number(c[2]),
            active: c[4],
            isDegree: Boolean(c[5])
          });
        }
      }
      setCourses(fetchedCourses);
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
      
      if (createMode === 'degree') {
        const tx = await contract.createDegree(courseName, courseCode);
        await tx.wait();
      } else {
        const tx = await contract.createCourse(courseName, courseCode);
        await tx.wait();
      }
      
      setCourseName("");
      setCourseCode("");
      alert(`${createMode === 'degree' ? 'Degree' : 'Course'} successfully created on-chain!`);
      await fetchCourses(provider, signer.address);
    } catch (err: any) {
      alert(err.reason || err.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroups.length === 0 || !studentCommitment) return alert("Select at least one course/degree and enter commitment");
    if (!window.ethereum) return;
    setIssuing(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, signer);
      
      let successCount = 0;
      let skippedCount = 0;
      
      for (let i = 0; i < selectedGroups.length; i++) {
        setIssueProgress(`Issuing ${i + 1}/${selectedGroups.length}... (Please confirm transaction)`);
        try {
          const tx = await contract.issueCredential(selectedGroups[i], studentCommitment);
          await tx.wait();
          successCount++;
        } catch (err: any) {
          // 0x258a195a is LeafAlreadyExists() from LeanIMT (Semaphore), meaning student is already enrolled
          if (err.message?.includes('0x258a195a') || err.data === '0x258a195a' || err.info?.error?.data === '0x258a195a') {
            const courseName = courses.find(c => c.groupId === selectedGroups[i])?.name || "this course";
            alert(`Skipped: Student is already enrolled in ${courseName}.`);
            skippedCount++;
          } else {
            throw err; // Re-throw actual errors to be caught by the outer block
          }
        }
      }
      
      setStudentCommitment("");
      setSelectedGroups([]);
      alert(`Finished! Successfully issued ${successCount} credential(s).${skippedCount > 0 ? ` Skipped ${skippedCount} existing.` : ''}`);
      await fetchCourses(provider, signer.address);
    } catch (err: any) {
      alert(err.reason || err.message || "Failed to issue credential");
    } finally {
      setIssuing(false);
      setIssueProgress("");
    }
  };

  const toggleSelectGroup = (gid: number) => {
    setSelectedGroups(prev => 
      prev.includes(gid) ? prev.filter(g => g !== gid) : [...prev, gid]
    );
  };

  const handleLinkCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCourseGroupId || !linkDegreeGroupId) return alert("Select both course and degree to link");
    if (!window.ethereum) return;
    setLinking(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, signer);
      
      const tx = await contract.linkCourseToDegree(linkCourseGroupId, linkDegreeGroupId);
      await tx.wait();
      
      alert("Successfully linked course to degree!");
      setLinkCourseGroupId(null);
      setLinkDegreeGroupId(null);
    } catch (err: any) {
      alert(err.reason || err.message || "Failed to link");
    } finally {
      setLinking(false);
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

  const degrees = courses.filter(c => c.isDegree);
  const regularCourses = courses.filter(c => !c.isDegree);

  return (
    <div className="max-w-6xl mx-auto py-12 animate-in fade-in duration-1000">
      <header className="mb-12">
        <h1 className="text-4xl font-serif font-bold text-slate-100 mb-2">
          {universityName ? `${universityName} Dashboard` : "University Dashboard"}
        </h1>
        <p className="text-slate-400 font-serif italic">Manage your active courses and issue secure credentials.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Create Course/Degree Panel */}
        <div className="p-8 border border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-bold text-slate-200">Create New {createMode === 'degree' ? 'Degree' : 'Course'}</h2>
            <div className="flex bg-slate-950 p-1 border border-slate-800 rounded">
              <button 
                type="button"
                className={`px-3 py-1 text-xs font-semibold ${createMode === 'course' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                onClick={() => setCreateMode('course')}
              >
                Course
              </button>
              <button 
                type="button"
                className={`px-3 py-1 text-xs font-semibold ${createMode === 'degree' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                onClick={() => setCreateMode('degree')}
              >
                Degree
              </button>
            </div>
          </div>
          <form onSubmit={handleCreateCourse} className="space-y-6">
            <div>
              <label className="block text-sm font-serif text-slate-400 mb-2">Name</label>
              <input 
                type="text" required
                value={courseName} onChange={e => setCourseName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-4 py-3 text-slate-100 focus:outline-none focus:border-slate-500"
                placeholder={createMode === 'degree' ? "e.g. Master of Computer Science" : "e.g. Data Structures"}
              />
            </div>
            <div>
              <label className="block text-sm font-serif text-slate-400 mb-2">Code</label>
              <input 
                type="text" required
                value={courseCode} onChange={e => setCourseCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-4 py-3 text-slate-100 focus:outline-none focus:border-slate-500"
                placeholder={createMode === 'degree' ? "e.g. MCS" : "e.g. CS201"}
              />
            </div>
            <Button type="submit" className="w-full" isLoading={creating}>
              Create {createMode === 'degree' ? 'Degree' : 'Course'} Group
            </Button>
          </form>

          {createMode === 'degree' && (
            <div className="mt-8 pt-6 border-t border-slate-800">
              <h3 className="text-xl font-serif font-bold text-slate-200 mb-4">Link Courses to this Degree</h3>
              <form onSubmit={handleLinkCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-serif text-slate-400 mb-1">Select Degree</label>
                  <select
                    required
                    value={linkDegreeGroupId || ""}
                    onChange={e => setLinkDegreeGroupId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-slate-100 text-sm focus:outline-none"
                  >
                    <option value="" disabled>-- Select Degree --</option>
                    {degrees.map(c => (
                      <option key={c.groupId} value={c.groupId}>{c.code}: {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-serif text-slate-400 mb-1">Select Course to Link</label>
                  <select
                    required
                    value={linkCourseGroupId || ""}
                    onChange={e => setLinkCourseGroupId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-slate-100 text-sm focus:outline-none"
                  >
                    <option value="" disabled>-- Select Course --</option>
                    {regularCourses.map(c => (
                      <option key={c.groupId} value={c.groupId}>{c.code}: {c.name}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" variant="outline" className="w-full" isLoading={linking}>
                  Link Course
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Issue Credential Panel */}
        <div className="p-8 border border-slate-800 bg-slate-900/50">
          <h2 className="text-2xl font-serif font-bold text-slate-200 mb-6">Issue Credential(s)</h2>
          <form onSubmit={handleIssueCredential} className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-serif text-slate-400">Select Courses / Degrees</label>
                <button 
                  type="button"
                  className="text-xs text-blue-400 hover:text-blue-300"
                  onClick={() => {
                    if (selectedGroups.length === courses.length) setSelectedGroups([]);
                    else setSelectedGroups(courses.map(c => c.groupId));
                  }}
                >
                  {selectedGroups.length === courses.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 bg-slate-950 p-4 border border-slate-800">
                {courses.length === 0 && <div className="text-xs text-slate-500 italic">No courses available</div>}
                {courses.map(c => (
                  <label key={c.groupId} className="flex items-center gap-3 p-2 hover:bg-slate-900 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedGroups.includes(c.groupId)}
                      onChange={() => toggleSelectGroup(c.groupId)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-slate-200 text-sm">
                      {c.isDegree ? '🎓 ' : ''}{c.code}: {c.name}
                    </span>
                  </label>
                ))}
              </div>
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
              {issuing ? (issueProgress || 'Issuing...') : `Issue ${selectedGroups.length > 0 ? selectedGroups.length : ''} Credential(s) to Student`}
            </Button>
          </form>
        </div>
      </div>

      {/* ── Active Courses List ─────────────────────────────── */}
      <section className="border-t border-slate-800 pt-10">
        <h2 className="text-2xl font-serif font-bold text-slate-200 mb-2">Active Courses & Degrees</h2>
        <p className="text-slate-500 text-sm font-serif italic mb-6">All offerings registered on-chain for your institution.</p>

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
                    {c.isDegree ? '🎓' : c.code.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-serif font-semibold text-slate-200">{c.name}</p>
                      {c.isDegree && (
                        <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-[10px] font-bold tracking-wider rounded-full">
                          DEGREE
                        </span>
                      )}
                    </div>
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
