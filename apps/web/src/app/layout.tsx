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

              <WalletButton />
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
