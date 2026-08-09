'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRole } from '../../lib/hooks/useRole';
import GlassCard from '../../components/GlassCard';

export default function UniversityGateway() {
  const { isUniversity, isLoading } = useRole();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mocking the contract call to requestRegistration
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
      </div>
    );
  }

  if (isUniversity) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <GlassCard className="text-center space-y-6 py-12">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center text-4xl mb-4">
            🎓
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome back, University!</h1>
          <p className="text-slate-400">Manage courses and issue privacy-preserving credentials.</p>
          <div className="pt-4">
            <Link href="/university/dashboard" className="btn-primary inline-block">
              Go to Dashboard
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <GlassCard className="text-center space-y-6 py-12 border-emerald-500/30">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center text-4xl mb-4">
            ⏳
          </div>
          <h1 className="text-3xl font-bold text-white">Registration Pending</h1>
          <p className="text-slate-400">
            Your registration has been submitted to the blockchain. An administrator will review your application shortly.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Register Your Institution</h1>
        <p className="text-slate-400">Join the Eternity-ID network to issue verifiable credentials.</p>
      </div>

      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">University Name</label>
            <input 
              type="text" 
              required
              className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="e.g. IIT Guwahati"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Department (Optional)</label>
            <input 
              type="text" 
              className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="e.g. Computer Science"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Contact Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="admin@university.edu"
            />
          </div>
          
          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-primary w-full flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
              ) : null}
              {isSubmitting ? 'Submitting to Network...' : 'Register on Blockchain'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
