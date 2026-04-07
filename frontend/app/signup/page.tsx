import type { Metadata } from 'next';
import AuthPageShell from '@/components/auth/AuthPageShell';
import SignupForm from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Create Account — BodyQ',
  description: 'Start your free BodyQ account. AI posture analysis, personalized plans, and smart nutrition — no credit card needed.',
};

export default function SignupPage() {
  return (
    <AuthPageShell
      title="Create your account"
      subtitle="Free forever. No credit card required. Start training smarter today."
    >
      <SignupForm />
    </AuthPageShell>
  );
}
