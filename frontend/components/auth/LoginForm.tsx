'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';

/* ----------------------------------------------------------
   LOGIN FORM
   Fields: Email, Password (mirrors mobile SignIn.js)
   On success: redirects to /dashboard (admin) or /app (user)
   Error states shown inline under each field.
   ---------------------------------------------------------- */

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError('Email is required.'); return; }
    if (!password) { setError('Password is required.'); return; }

    setLoading(true);
    try {
      // Use the SSR browser client so the session is stored in cookies,
      // making it visible to the Next.js middleware which reads from cookies.
      // The plain createClient from @supabase/supabase-js only writes to
      // localStorage, which the server-side middleware cannot read.
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError) throw authError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('goal, onboarded, role')
        .eq('id', authData.user.id)
        .single();

      const isNew = !(profile?.goal && profile?.onboarded);
      const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
      router.refresh();
      router.push(isNew ? '/onboarding' : isAdmin ? '/dashboard' : '/app');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
      setError(message.includes('Invalid') ? 'Invalid email or password.' : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ width: '100%' }}>
      {/* Global error */}
      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(252,92,92,0.1)',
            border: '1px solid rgba(252,92,92,0.35)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontFamily: 'var(--font-inter)',
            fontSize: '14px',
            color: '#fc5c5c',
          }}
        >
          {error}
        </div>
      )}

      {/* Email */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="login-email" style={labelStyle}>Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--bq-purple)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
        />
      </div>

      {/* Password */}
      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="login-password" style={labelStyle}>Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--bq-purple)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
        />
      </div>

      {/* Forgot password */}
      <div style={{ textAlign: 'right', marginBottom: '28px' }}>
        <Link
          href="/forgot-password"
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '13px',
            color: 'var(--bq-muted)',
            textDecoration: 'none',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--bq-lime)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--bq-muted)'; }}
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          style={{ justifyContent: 'center', opacity: loading ? 0.7 : 1, padding: '14px 48px' } as React.CSSProperties}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </div>

      {/* Switch to sign up */}
      <p
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '14px',
          color: 'var(--bq-muted)',
          textAlign: 'center',
          marginTop: '24px',
        }}
      >
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          style={{ color: 'var(--bq-lime)', textDecoration: 'none', fontWeight: 600 }}
        >
          Create one free
        </Link>
      </p>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-inter)',
  fontWeight: 500,
  fontSize: '13px',
  color: 'rgba(255,255,255,0.7)',
  marginBottom: '8px',
  letterSpacing: '0.02em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  color: 'var(--bq-white)',
  fontFamily: 'var(--font-inter)',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 150ms ease',
  boxSizing: 'border-box',
};
