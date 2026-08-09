import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function GlassCard({ children, title, className = '' }: GlassCardProps) {
  return (
    <div className={`glass glass-hover p-6 rounded-2xl ${className}`}>
      {title && <h3 className="text-xl font-bold text-white mb-4">{title}</h3>}
      {children}
    </div>
  );
}
