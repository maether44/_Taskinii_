import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getProfile } from "../services/profileService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isNewUser, setIsNewUser] = useState();
  const [loading, setLoading] = useState(true);

  const resolveUser = async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      // setIsNewUser(false);
      setLoading(false);
      return;
    }

    setUser(sessionUser);

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
  };

  useEffect(() => {
    // Check session on app launch
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveUser(session?.user ?? null);
    });

    // Listen for sign in / sign out events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) =>
      resolveUser(session?.user ?? null),
    );

    return () => subscription.unsubscribe();
  }, []);

  const markOnboardingComplete = () => {
    setIsNewUser(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // commented that line because user is not new just signed out
    // setIsNewUser(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, isNewUser, loading, markOnboardingComplete, signOut }}
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
