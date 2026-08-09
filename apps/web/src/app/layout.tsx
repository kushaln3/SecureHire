import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import WalletButton from '../components/WalletButton';

export const metadata: Metadata = {
  title: 'Eternity-ID',
  description: 'Zero-Knowledge credential verification powered by Semaphore v4 and Kohaku Post-Quantum accounts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-navy-950 text-slate-100 min-h-screen relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-white">
        
        {/* Background gradient orbs */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px] mix-blend-screen opacity-30 animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen opacity-30 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Top Navigation */}
        <header className="sticky top-0 z-50 glass border-t-0 border-x-0 rounded-none border-white/10 bg-navy-950/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                  <span className="text-white font-black text-xl tracking-tighter">E</span>
                </div>
                <span className="text-2xl font-black tracking-tight text-white group-hover:opacity-90 transition-opacity">
                  Eternity<span className="gradient-text">-ID</span>
                </span>
              </Link>
              
              <nav className="hidden md:flex gap-8">
                <Link href="/student" className="text-sm font-semibold text-slate-300 hover:text-white hover:text-indigo-400 transition-colors">Student</Link>
                <Link href="/university" className="text-sm font-semibold text-slate-300 hover:text-white hover:text-indigo-400 transition-colors">University</Link>
                <Link href="/verify" className="text-sm font-semibold text-slate-300 hover:text-white hover:text-indigo-400 transition-colors">Verify</Link>
              </nav>

              <div className="flex items-center gap-4">
                <WalletButton />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {children}
        </main>
      </body>
    </html>
  );
}
