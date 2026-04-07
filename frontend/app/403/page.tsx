import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '403 — Access Denied | BodyQ',
};

export default function ForbiddenPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bq-bg, #0a0614)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-inter, Inter, sans-serif)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 24px',
        }}>
          🔒
        </div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 600, margin: '0 0 10px' }}>
          Access Denied
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, margin: '0 0 32px' }}>
          Your account doesn&apos;t have admin privileges. Contact a super admin to request access.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'var(--bq-purple, #7C5CFC)',
            color: '#fff',
            borderRadius: 10,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
