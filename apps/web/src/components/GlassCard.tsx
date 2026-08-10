import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function GlassCard({ children, title, className = '' }: GlassCardProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        padding: '1.5rem',
      }}
    >
      {title && <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem' }}>{title}</h3>}
      {children}
    </div>
  );
}
