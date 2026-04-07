import type { Metadata } from 'next';
import AuthPageShell from '@/components/auth/AuthPageShell';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In — BodyQ',
  description: 'Sign in to your BodyQ account and continue your AI-powered fitness journey.',
};

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Welcome back"
      subtitle="Sign in to your BodyQ account to continue your journey."
    >
      <LoginForm />
    </AuthPageShell>
  );
}
