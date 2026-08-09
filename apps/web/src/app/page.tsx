import Link from 'next/link';
import GlassCard from '../components/GlassCard';
import StepBadge from '../components/StepBadge';

export default function Home() {
  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="text-center space-y-8 pt-12">
        <div className="inline-block px-4 py-1.5 rounded-full glass border-indigo-500/30 text-indigo-300 text-sm font-semibold mb-4 animate-float">
          ✨ Built for IITG.eth Hackathon 2026
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Prove Your Credentials. <br/>
          <span className="gradient-text">Reveal Nothing.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Zero-Knowledge credential verification powered by Semaphore v4 and Kohaku Post-Quantum accounts. Built at IIT Guwahati.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <span className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-slate-300">Semaphore v4</span>
          <span className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-slate-300">Kohaku PQ</span>
          <span className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-slate-300">Ethereum Sepolia</span>
          <span className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-slate-300">Zero-Knowledge</span>
        </div>
      </section>

      {/* Portals */}
      <section className="grid md:grid-cols-3 gap-8">
        <GlassCard className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400 text-2xl">
            🎓
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Student Portal</h2>
          <p className="text-slate-400 mb-8 flex-1">
            Generate your quantum-safe identity and create zero-knowledge proofs of your credentials.
          </p>
          <Link href="/student" className="btn-primary w-full text-center">
            Enter as Student
          </Link>
        </GlassCard>

        <GlassCard className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-6 text-violet-400 text-2xl">
            🏛️
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">University Portal</h2>
          <p className="text-slate-400 mb-8 flex-1">
            Register your institution and issue privacy-preserving credentials to student identities.
          </p>
          <Link href="/university" className="btn-secondary w-full text-center">
            Enter as University
          </Link>
        </GlassCard>

        <GlassCard className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 text-2xl">
            💼
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Employer Verification</h2>
          <p className="text-slate-400 mb-8 flex-1">
            Instantly verify applicant credentials without seeing their private data or transcripts.
          </p>
          <Link href="/verify" className="btn-secondary w-full text-center">
            Verify a Proof
          </Link>
        </GlassCard>
      </section>

      {/* Stats Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Credentials Issued', value: '47' },
          { label: 'Verifications', value: '12' },
          { label: 'Universities', value: '3' },
          { label: 'Privacy Breaches', value: '0' },
        ].map((stat, i) => (
          <div key={i} className="glass p-6 text-center">
            <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center text-white mb-16">How Eternity-ID Works</h2>
        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-violet-500/0 -translate-y-1/2 -z-10"></div>
          
          <div className="grid md:grid-cols-5 gap-8">
            {[
              { icon: '🏛️', title: 'Register', desc: 'University registers on-chain' },
              { icon: '🔐', title: 'Identity', desc: 'Student creates ZK identity' },
              { icon: '📝', title: 'Issue', desc: 'Credential issued on-chain' },
              { icon: '⚡', title: 'Proof', desc: 'Student generates ZK proof' },
              { icon: '✅', title: 'Verify', desc: 'Employer verifies instantly' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl group-hover:bg-indigo-500/30 transition-colors"></div>
                  <div className="glass w-20 h-20 flex items-center justify-center text-3xl relative z-10 group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 z-20">
                    <StepBadge step={i + 1} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
