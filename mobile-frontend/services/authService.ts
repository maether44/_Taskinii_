import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

export const signUpUser = async (email, password, fullName) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: fullName.trim() },
    },
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('Failed to create user');

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: authData.user.id,
      full_name: fullName.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (profileError) throw new Error(profileError.message);

  log('✅ User created with ID:', authData.user.id);
  return authData;
};

export const signInUser = async (email, password) => {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  return authData;
};
