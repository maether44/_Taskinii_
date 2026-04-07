'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { getProfile, signOutUser } from '@/lib/supabase';

// Use the SSR browser client so this context shares the same cookie-based
// session as LoginForm and the Next.js middleware. The plain @supabase/supabase-js
// client uses localStorage and is invisible to server-side cookie checks.
const supabase = createClient();

/* ----------------------------------------------------------
   AUTH CONTEXT
   Mirrors the mobile AuthContext.js logic:
   - Tracks session / user state via supabase.auth.onAuthStateChange
   - Checks if profile is onboarded (goal + onboarded fields)
   - isNewUser = true → user needs onboarding
   - Exposes signOut helper
   ---------------------------------------------------------- */

interface Profile {
  full_name: string | null;
  goal: string | null;
  onboarded: boolean | null;
  role: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True if the user has not completed onboarding yet */
  isNewUser: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Re-fetch profile from DB (call after onboarding completes) */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const data = await getProfile(userId);
    setProfile(data);
  }, []);

  useEffect(() => {
    // Hydrate existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await signOutUser();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // isNewUser: profile exists but goal / onboarded not set yet
  const isNewUser =
    !!user && (!profile?.goal || !profile?.onboarded);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isNewUser, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
