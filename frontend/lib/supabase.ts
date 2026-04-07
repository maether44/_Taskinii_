import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/* ----------------------------------------------------------
   Auth helpers — mirrors mobile authService.ts logic
   ---------------------------------------------------------- */

export async function signUpUser(
  email: string,
  password: string,
  fullName: string
) {
  const trimmedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign-up failed — no user returned.');

  // Create the profile row (mirrors mobile authService.ts)
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      full_name: fullName.trim(),
    });

  // Profile insert failing is non-fatal — user can still log in
  // and profile can be created later during onboarding.
  if (profileError) {
    console.warn('Profile insert failed:', profileError.message);
  }

  return data;
}

export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, goal, onboarded, role')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}
