import Link from 'next/link';
import GlassCard from '../components/GlassCard';
import StepBadge from '../components/StepBadge';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6rem' }}>

      {/* Hero */}
      <section style={{ textAlign: 'center', paddingTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{
          display: 'inline-block', padding: '0.375rem 1rem',
          border: '1px solid rgba(255,255,255,0.12)',
          backgroundColor: 'rgba(255,255,255,0.04)',
          color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 500, letterSpacing: '0.05em',
        }}>
          ✦ Built for IITG.eth Hackathon 2026
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
          fontWeight: 700, lineHeight: 1.1,
          color: '#f1f5f9', maxWidth: '48rem',
        }}>
          Prove Your Credentials.{' '}
          <span style={{ color: '#a5b4fc' }}>Reveal Nothing.</span>
        </h1>

        <p style={{ color: '#64748b', fontSize: '1.125rem', maxWidth: '36rem', lineHeight: 1.7, fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
          Zero-Knowledge credential verification powered by Semaphore v4 and Kohaku Post-Quantum accounts. Built at IIT Guwahati.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', justifyContent: 'center', paddingTop: '1rem' }}>
          {['Semaphore v4', 'Kohaku PQ', 'Ethereum Sepolia', 'Groth16 ZK'].map(tag => (
            <span key={tag} style={{
              padding: '0.25rem 0.75rem',
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.03)',
              fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* Portals */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        {[
          { icon: '🎓', title: 'Student Portal', desc: 'Generate your quantum-safe identity and create zero-knowledge proofs of your credentials.', href: '/student', cta: 'Enter as Student' },
          { icon: '🏛️', title: 'University Portal', desc: 'Register your institution and issue privacy-preserving credentials to student identities.', href: '/university', cta: 'Enter as University' },
          { icon: '💼', title: 'Employer Verification', desc: 'Instantly verify applicant credentials without seeing their private data or transcripts.', href: '/verify', cta: 'Verify a Proof' },
        ].map(({ icon, title, desc, href, cta }) => (
          <GlassCard key={href}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1.25rem' }}>{icon}</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.75rem' }}>{title}</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.65, flexGrow: 1, marginBottom: '2rem' }}>{desc}</p>
              <Link href={href} className="btn-primary" style={{ width: '100%', textAlign: 'center', textDecoration: 'none', display: 'block', padding: '0.75rem' }}>
                {cta}
              </Link>
            </div>
          </GlassCard>
        ))}
      </section>



      {/* How It Works */}
      <section style={{ paddingBottom: '3rem' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, textAlign: 'center', color: '#f1f5f9', marginBottom: '4rem' }}>
          How SecureHire Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '2rem' }}>
          {[
            { icon: '🏛️', title: 'Register', desc: 'University registers on-chain via MoE' },
            { icon: '🔐', title: 'Identity', desc: 'Student creates ZK identity' },
            { icon: '📝', title: 'Issue', desc: 'Credential issued on-chain' },
            { icon: '⚡', title: 'Prove', desc: 'Student generates ZK proof' },
            { icon: '✅', title: 'Verify', desc: 'Employer verifies instantly' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '5rem', height: '5rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem',
                }}>
                  {step.icon}
                </div>
                <div style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem' }}>
                  <StepBadge step={i + 1} />
                </div>
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>{step.title}</h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Presentation Link */}
      <style>{`
        .presentation-link:hover {
          background-color: rgba(165,180,252,0.12) !important;
          border-color: rgba(165,180,252,0.5) !important;
        }
      `}</style>
      <section style={{ textAlign: 'center', paddingBottom: '3rem' }}>
        <a
          href="/presentation.html"
          target="_blank"
          rel="noopener noreferrer"
          className="presentation-link"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.75rem 2rem',
            border: '1px solid rgba(165,180,252,0.25)',
            backgroundColor: 'rgba(165,180,252,0.05)',
            color: '#a5b4fc',
            fontSize: '0.9375rem',
            fontWeight: 500,
            textDecoration: 'none',
            letterSpacing: '0.02em',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '1rem' }}>&#9654;</span>
          Project Presentation
        </a>
        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#334155', letterSpacing: '0.05em' }}>
          IITG.eth Hackathon 2026 — Slide Deck
        </p>
      </section>

    </div>
  );
}
