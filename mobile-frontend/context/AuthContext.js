import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile } from '../services/profileService';
import { getLocalAvatarForUser } from '../lib/avatar';
import { warn } from '../lib/logger';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isNewUser, setIsNewUser] = useState();
  const [loading, setLoading] = useState(true);
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [profileAvatarUri, setProfileAvatarUri] = useState(null);

  const resolveUser = async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      setProfileAvatarUri(null);
      // setIsNewUser(false);
      setLoading(false);
      return;
    }

    setUser(sessionUser);
    const localAvatarUri = await getLocalAvatarForUser(sessionUser.id).catch(() => null);
    setProfileAvatarUri(localAvatarUri);

    try {
      const profile = await getProfile(sessionUser.id);
      // New user = exists but hasn't completed onboarding yet
      setIsNewUser(!(profile?.goal && profile?.onboarded));
    } catch {
      // Profile row doesn't exist yet — brand new signup
      setIsNewUser(true);
    } finally {
      setLoading(false);
    }

    // Persistent login-streak bookkeeping — deferred to the next tick and
    // wrapped in Promise.resolve(...) so PostgrestFilterBuilder rejections
    // can't propagate into the auth flow. Runs AFTER setLoading(false) so
    // nothing about this call can influence the splash screen. Idempotent
    // per day — safe to call on every session resolve.
    setTimeout(() => {
      Promise.resolve(supabase.rpc('record_user_visit', { p_user_id: sessionUser.id }))
        .then((res) => {
          if (res?.error) {
            warn('[AuthContext] record_user_visit:', res.error.message);
          }
        })
        .catch((e) => {
          warn('[AuthContext] record_user_visit threw:', e?.message ?? e);
        });
    }, 0);
  };

  useEffect(() => {
    // Check session on app launch
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveUser(session?.user ?? null);
    });

    // Listen for sign in / sign out events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => resolveUser(session?.user ?? null));

    return () => subscription.unsubscribe();
  }, []);

  const markOnboardingComplete = () => {
    setIsNewUser(false);
    setShouldShowTour(true); // Trigger tour after onboarding
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfileAvatarUri(null);
    // commented that line because user is not new just signed out
    // setIsNewUser(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isNewUser,
        loading,
        markOnboardingComplete,
        signOut,
        shouldShowTour,
        setShouldShowTour,
        profileAvatarUri,
        setProfileAvatarUri,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
