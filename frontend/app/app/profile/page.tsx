'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useStreaks } from '@/hooks/useStreaks';
import StreakBadge from '@/components/app/shared/StreakBadge';

/* ----------------------------------------------------------
   PROFILE PAGE  /app/profile
   2-column layout: avatar + stats left, 4 settings tabs right
   Tabs: Overview | Stats | Goals | Account
   ---------------------------------------------------------- */

type Tab = 'overview' | 'stats' | 'goals' | 'account';

const GOAL_LABELS: Record<string, string> = {
  lose_weight:   '🔥 Lose Weight',
  gain_muscle:   '💪 Gain Muscle',
  maintain:      '⚖️ Maintain Weight',
  improve_fitness: '🏃 Improve Fitness',
  gain_weight:   '📈 Gain Weight',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary:      'Sedentary',
  lightly_active: 'Lightly Active',
  moderately_active: 'Moderately Active',
  very_active:    'Very Active',
  extra_active:   'Extra Active',
};

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const { streaks } = useStreaks();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [signingOut, setSigningOut] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push('/');
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px' }}>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 24, color: 'var(--bq-white)', marginBottom: 24, marginTop: 0 }}>
        Profile
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 260px) 1fr', gap: 20, alignItems: 'start' }}>
        {/* ── LEFT: Avatar card + streak summary ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Avatar card */}
          <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--bq-purple) 0%, #9B7DFF 100%)',
              border: '3px solid rgba(124,92,252,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 28, color: '#fff',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-white)' }}>
                {profile?.full_name ?? 'My Account'}
              </div>
              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)', marginTop: 4, wordBreak: 'break-all' }}>
                {user?.email}
              </div>
            </div>
            {profile?.goal && (
              <div style={{ padding: '6px 14px', background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 99 }}>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-purple)' }}>
                  {GOAL_LABELS[profile.goal] ?? profile.goal}
                </span>
              </div>
            )}
          </div>

          {/* Streak card */}
          <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 20, padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 600, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Current Streaks
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <StreakBadge count={streaks.overall}   label="Overall"   size="sm" />
              <StreakBadge count={streaks.workout}   label="Workouts"  size="sm" />
              <StreakBadge count={streaks.nutrition} label="Nutrition" size="sm" />
              <StreakBadge count={streaks.water}     label="Hydration" size="sm" />
              <StreakBadge count={streaks.steps}     label="Steps"     size="sm" />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Tabs ── */}
        <div>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bq-surface-2)', padding: 4, borderRadius: 12 }}>
            {([['overview', 'Overview'], ['stats', 'Body Stats'], ['goals', 'Goals'], ['account', 'Account']] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                  fontSize: 13,
                  fontWeight: 500,
                  background: tab === t ? 'var(--bq-purple)' : 'transparent',
                  color: tab === t ? '#fff' : 'var(--bq-muted)',
                  transition: 'background 200ms ease, color 200ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* OVERVIEW tab */}
          {tab === 'overview' && (
            <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 24 }}>
              <h2 style={sectionHeadingStyle}>Personal Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <InfoRow label="Full Name"   value={profile?.full_name ?? '—'} />
                <InfoRow label="Email"       value={user?.email ?? '—'} />
                <InfoRow label="Goal"        value={profile?.goal ? (GOAL_LABELS[profile.goal] ?? profile.goal) : '—'} />
                <InfoRow label="Activity Level" value={profile?.activity_level ? (ACTIVITY_LABELS[profile.activity_level] ?? profile.activity_level) : '—'} />
              </div>
            </div>
          )}

          {/* STATS tab */}
          {tab === 'stats' && (
            <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 24 }}>
              <h2 style={sectionHeadingStyle}>Body Statistics</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <StatBlock label="Weight"        value={profile?.weight_kg ? `${profile.weight_kg} kg` : '—'} color="var(--bq-lime)" />
                <StatBlock label="Height"        value={profile?.height_cm ? `${profile.height_cm} cm` : '—'} color="#38BDF8" />
                <StatBlock label="Target Weight" value={profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : '—'} color="#A78BFA" />
                <StatBlock label="Gender"        value={profile?.gender ?? '—'} color="#F59E0B" />
              </div>
              {profile?.date_of_birth && (
                <div style={{ marginTop: 14 }}>
                  <InfoRow label="Date of Birth" value={new Date(profile.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                </div>
              )}
            </div>
          )}

          {/* GOALS tab */}
          {tab === 'goals' && (
            <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 24 }}>
              <h2 style={sectionHeadingStyle}>My Goals</h2>
              {profile?.goal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '14px 16px', background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 12 }}>
                    <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-purple)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Primary Goal</div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-white)' }}>
                      {GOAL_LABELS[profile.goal] ?? profile.goal}
                    </div>
                  </div>
                  {profile.activity_level && (
                    <div style={{ padding: '14px 16px', background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: 12 }}>
                      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-lime)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Activity Level</div>
                      <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-white)' }}>
                        {ACTIVITY_LABELS[profile.activity_level] ?? profile.activity_level}
                      </div>
                    </div>
                  )}
                  {profile.target_weight_kg && (
                    <div style={{ padding: '14px 16px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 12 }}>
                      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: '#38BDF8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Weight</div>
                      <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-white)' }}>
                        {profile.target_weight_kg} kg
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--bq-muted)', fontFamily: 'var(--font-inter)', fontSize: 14 }}>
                  No goals set. Update your profile in the mobile app.
                </div>
              )}
            </div>
          )}

          {/* ACCOUNT tab */}
          {tab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 24 }}>
                <h2 style={sectionHeadingStyle}>Account Details</h2>
                <InfoRow label="Email"    value={user?.email ?? '—'} />
                <div style={{ marginTop: 12 }}>
                  <InfoRow label="User ID" value={user?.id ?? '—'} mono />
                </div>
                <div style={{ marginTop: 12 }}>
                  <InfoRow label="Joined"  value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
                </div>
              </div>

              <div style={{ background: 'var(--bq-surface-2)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 24 }}>
                <h2 style={{ ...sectionHeadingStyle, color: '#EF4444' }}>Sign Out</h2>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-muted)', marginTop: 0, marginBottom: 16 }}>
                  You will be signed out of your account on this device.
                </p>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  style={{
                    padding: '10px 24px',
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    borderRadius: 10,
                    color: '#EF4444',
                    fontFamily: 'var(--font-inter)',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: signingOut ? 'not-allowed' : 'pointer',
                    opacity: signingOut ? 0.6 : 1,
                    transition: 'opacity 200ms ease',
                  }}
                >
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: mono ? 'monospace' : 'var(--font-inter)', fontSize: mono ? 12 : 14, color: 'var(--bq-white)', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--bq-surface-3)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 20, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>{label}</div>
    </div>
  );
}

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-syne)',
  fontWeight: 700,
  fontSize: 16,
  color: 'var(--bq-white)',
  marginTop: 0,
  marginBottom: 18,
};
