import React, { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

const MOCK_USER = {
  firstName: "Alex",
  lastName: "Smith",
  name: "Alex Smith",
  email: "alex@example.com",
  gender: "Prefer not to say",
  age: 28,
  dateOfBirth: "1996-05-15",
  weightKg: 75,
  heightCm: 185,
  profilePhotoUrl: null,
  fitnessGoals: "Build muscle & improve endurance",
  activityLevel: "Intermediate",
  healthPreferences: "Track macros, weekly progress reports",
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [user, setUser] = useState(MOCK_USER);

  const login = useCallback(() => {
    setIsAuthenticated(true);
    setUser(MOCK_USER);
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const updateProfile = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
