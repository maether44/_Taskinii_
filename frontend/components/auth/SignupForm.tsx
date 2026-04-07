'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';

/* ----------------------------------------------------------
   SIGNUP FORM
   Fields: Full Name, Email, Password, Confirm Password
   Mirrors mobile SignUp.js validation logic:
     - Full Name required
     - Email pattern validation
     - Password min 6 characters
     - Passwords must match
   On success: redirects to /dashboard (if no email confirm needed)
               or shows "check your email" message.
   ---------------------------------------------------------- */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  function validate(): string | null {
    if (!fullName.trim()) return 'Full name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Sign-up failed — no user returned.');

      // Upsert the profile row so full_name is saved even if the trigger ran first
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, full_name: fullName.trim() }, { onConflict: 'id' });
      }

      // Supabase returns no session when email confirmation is required
      if (data.user && !data.session) {
        setNeedsEmailConfirm(true);
      } else {
        // Session is in cookies — refresh cache then navigate to onboarding
        router.refresh();
        router.push('/onboarding');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-up failed. Please try again.';
      setError(
        message.toLowerCase().includes('already registered') || message.toLowerCase().includes('user already')
          ? 'An account with this email already exists.'
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  // Email confirmation state
  if (needsEmailConfirm) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '48px',
            marginBottom: '20px',
          }}
          aria-hidden="true"
        >
          📬
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 700,
            fontSize: '24px',
            color: 'var(--bq-white)',
            marginBottom: '12px',
          }}
        >
          Check your inbox
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '15px',
            color: 'var(--bq-muted)',
            lineHeight: 1.6,
            marginBottom: '32px',
            maxWidth: '340px',
            margin: '0 auto 32px',
          }}
        >
          We sent a confirmation link to{' '}
          <strong style={{ color: 'var(--bq-white)' }}>{email}</strong>. Click
          it to activate your account, then sign in.
        </p>
        <Button variant="primary" href="/login">
          Go to Sign In
        </Button>
      </div>
    );
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

      {/* Full Name */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="signup-name" style={labelStyle}>Full Name</label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Alex Johnson"
          required
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--bq-purple)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
        />
      </div>

      {/* Email */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="signup-email" style={labelStyle}>Email</label>
        <input
          id="signup-email"
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
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="signup-password" style={labelStyle}>
          Password <span style={{ color: 'var(--bq-muted)', fontWeight: 400 }}>(min. 6 characters)</span>
        </label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--bq-purple)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
        />
      </div>

      {/* Confirm Password */}
      <div style={{ marginBottom: '28px' }}>
        <label htmlFor="signup-confirm" style={labelStyle}>Confirm Password</label>
        <input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
          style={{
            ...inputStyle,
            borderColor:
              confirmPassword && confirmPassword !== password
                ? 'rgba(252,92,92,0.6)'
                : 'rgba(255,255,255,0.12)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--bq-purple)'; }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor =
              confirmPassword && confirmPassword !== password
                ? 'rgba(252,92,92,0.6)'
                : 'rgba(255,255,255,0.12)';
          }}
        />
        {confirmPassword && confirmPassword !== password && (
          <p style={{ marginTop: '6px', fontSize: '12px', color: '#fc5c5c', fontFamily: 'var(--font-inter)' }}>
            Passwords do not match
          </p>
        )}
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          style={{ justifyContent: 'center', opacity: loading ? 0.7 : 1, padding: '14px 48px' } as React.CSSProperties}
        >
          {loading ? 'Creating account…' : 'Create Free Account'}
        </Button>

        {/* Terms note */}
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '12px',
            color: 'var(--bq-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          By creating an account you agree to our{' '}
          <Link href="/terms" style={{ color: 'var(--bq-lime)', textDecoration: 'none' }}>Terms</Link>{' '}
          and{' '}
          <Link href="/privacy" style={{ color: 'var(--bq-lime)', textDecoration: 'none' }}>Privacy Policy</Link>.
        </p>
      </div>

      {/* Switch to sign in */}
      <p
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '14px',
          color: 'var(--bq-muted)',
          textAlign: 'center',
          marginTop: '20px',
        }}
      >
        Already have an account?{' '}
        <Link
          href="/login"
          style={{ color: 'var(--bq-lime)', textDecoration: 'none', fontWeight: 600 }}
        >
          Sign in
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
