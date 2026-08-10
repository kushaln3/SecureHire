'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/student', label: 'Student' },
  { href: '/university', label: 'University' },
  { href: '/verify', label: 'Verify' },
  { href: '/admin', label: 'MoE Admin' },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav style={{ display: 'flex', gap: '2rem' }}>
      {links.map(({ href, label }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: active ? '#f1f5f9' : '#64748b',
              textDecoration: 'none',
              transition: 'color 0.15s',
              borderBottom: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              paddingBottom: '2px',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
