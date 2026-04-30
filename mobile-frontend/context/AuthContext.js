import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getProfile } from "../services/profileService";
import { getLocalAvatarForUser } from "../lib/avatar";
import { warn } from "../lib/logger";
import { scheduleStore } from "../store/scheduleStore"; // ← ADD THIS

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
      setLoading(false);
      await scheduleStore.clear(); // ← CLEAR on logout (no user ID needed, currentUid is tracked)
      return;
    }

    setUser(sessionUser);
    // After setUser(sessionUser), add:
const { data: savedPlan } = await supabase
  .from('training_plans')
  .select('plan_json')
  .eq('user_id', sessionUser.id)
  .maybeSingle();

if (savedPlan?.plan_json) {
  // Load this user's plan into the store from Supabase
  await scheduleStore.set(savedPlan.plan_json, sessionUser.id);
} else {
  // No plan in Supabase, try AsyncStorage
  await scheduleStore.hydrate(sessionUser.id);
}
    await scheduleStore.hydrate(sessionUser.id); // ← HYDRATE with real user ID

    const localAvatarUri = await getLocalAvatarForUser(sessionUser.id).catch(() => null);
    setProfileAvatarUri(localAvatarUri);

    try {
      const profile = await getProfile(sessionUser.id);
      setIsNewUser(!(profile?.goal && profile?.onboarded));
    } catch {
      setIsNewUser(true);
    } finally {
      setLoading(false);
    }

    setTimeout(() => {
      Promise.resolve(
        supabase.rpc("record_user_visit", { p_user_id: sessionUser.id }),
      )
        .then((res) => {
          if (res?.error) {
            warn("[AuthContext] record_user_visit:", res.error.message);
          }
        })
        .catch((e) => {
          warn("[AuthContext] record_user_visit threw:", e?.message ?? e);
        });
    }, 0);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) =>
      resolveUser(session?.user ?? null),
    );

    return () => subscription.unsubscribe();
  }, []);

  const markOnboardingComplete = () => {
    setIsNewUser(false);
    setShouldShowTour(true);
  };

  const resetToOnboarding = () => {
    setIsNewUser(true);
  };

  const signOut = async () => {
    await scheduleStore.clear(user?.id); // ← CLEAR this user's schedule on sign out
    await supabase.auth.signOut();
    setUser(null);
    setProfileAvatarUri(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isNewUser,
        loading,
        markOnboardingComplete,
        resetToOnboarding,
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
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}