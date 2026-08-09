'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRole } from '../../../lib/hooks/useRole';
import GlassCard from '../../../components/GlassCard';

export default function UniversityDashboard() {
  const { isUniversity, isLoading } = useRole();
  const [activeTab, setActiveTab] = useState<'courses' | 'issue'>('courses');

  if (isLoading) {
    return <div className="flex justify-center py-24"><div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div></div>;
  }

  // Allow bypassing the role check for demo purposes (optional)
  // if (!isUniversity) {
  //   return (
  //     <div className="max-w-2xl mx-auto py-12 text-center">
  //       <GlassCard>
  //         <h1 className="text-2xl font-bold text-red-400 mb-4">Unauthorized</h1>
  //         <p className="text-slate-400 mb-6">Your wallet does not have the UNIVERSITY_ROLE.</p>
  //         <Link href="/university" className="btn-secondary">Go Back</Link>
  //       </GlassCard>
  //     </div>
  //   );
  // }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">University Dashboard</h1>
          <p className="text-slate-400">Manage courses and issue ZK credentials to students.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8 border-b border-white/10 pb-1">
        <button 
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-[1px] ${activeTab === 'courses' ? 'text-indigo-400 border-indigo-500' : 'text-slate-400 border-transparent hover:text-white'}`}
        >
          Courses
        </button>
        <button 
          onClick={() => setActiveTab('issue')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-[1px] ${activeTab === 'issue' ? 'text-indigo-400 border-indigo-500' : 'text-slate-400 border-transparent hover:text-white'}`}
        >
          Issue Credentials
        </button>
      </div>

      {activeTab === 'courses' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Active Courses</h2>
            <button className="btn-primary text-sm py-2 px-4">+ New Course</button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GlassCard>
              <div className="text-xs font-mono text-indigo-400 mb-2">Group ID: 1042</div>
              <h3 className="text-lg font-bold text-white mb-1">Data Structures & Algorithms</h3>
              <p className="text-slate-400 text-sm mb-4">Code: CS201</p>
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <span className="text-sm text-slate-400">Enrolled: 45</span>
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-semibold">Active</span>
              </div>
            </GlassCard>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <GlassCard title="Issue New Credential">
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Course</label>
                  <select className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    <option value="1042">CS201 - Data Structures & Algorithms</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Student Commitment Hash</label>
                  <input 
                    type="text" 
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="0x..."
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    No student identity is stored on-chain — only commitment hashes. Privacy by design.
                  </p>
                </div>
                <button type="submit" className="btn-primary w-full">Issue Credential on-chain</button>
              </form>
            </GlassCard>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white">Recent Issuances</h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass p-4 text-sm">
                  <div className="text-indigo-400 font-mono mb-1">0x7f2...a9b3</div>
                  <div className="text-slate-300">CS201</div>
                  <div className="text-slate-500 text-xs mt-2">2 hours ago</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
