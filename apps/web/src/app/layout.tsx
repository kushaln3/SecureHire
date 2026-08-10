import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import WalletButton from '../components/WalletButton';
import NavLinks from '../components/NavLinks';

export const metadata: Metadata = {
  title: 'SecureHire — Zero-Knowledge Credential Verification',
  description: 'Privacy-preserving credential verification powered by Semaphore v4 and Post-Quantum cryptography.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0f1115', color: '#e2e8f0', minHeight: '100vh', overflowX: 'hidden' }}>

        {/* Top Navigation */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          backgroundColor: 'rgba(15,17,21,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5rem' }}>

              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                <div style={{
                  width: '2rem', height: '2rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Playfair Display', serif", fontWeight: 700, color: 'white',
                }}>
                  E
                </div>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700, fontSize: '1.375rem',
                  color: '#f1f5f9', letterSpacing: '-0.01em',
                }}>
                  SecureHire
                </span>
              </Link>

              {/* Client component handles active state & hover */}
              <NavLinks />

              <style>{`
                .nav-github-link:hover { color: #f1f5f9 !important; }
              `}</style>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <a 
                  href="https://github.com/kushaln3/SecureHire" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="nav-github-link"
                  style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500, transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}
                >
                  <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                  </svg>
                  GitHub
                </a>
                <WalletButton />
              </div>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
