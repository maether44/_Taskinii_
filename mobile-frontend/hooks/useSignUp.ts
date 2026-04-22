import { useState } from 'react';
import { signUpUser } from '../services/authService';

export function useSignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignUp = async ({ email, password, fullName }) => {
    setLoading(true);
    setError(null);
    try {
      const authData = await signUpUser(email, password, fullName);
      return authData; // let the screen decide what to do next
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { handleSignUp, loading, error };
}
