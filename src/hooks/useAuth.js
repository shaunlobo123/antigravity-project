import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

/**
 * Custom hook to manage Supabase Auth state and actions.
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Subscribe to authentication state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (SIGN_IN, SIGN_OUT, USER_UPDATED, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign up a new user with email and password, and automatically
   * insert a profile row into the public profiles table.
   * 
   * @param {string} email 
   * @param {string} password 
   * @param {object} additionalProfileData - e.g. { username, display_name }
   */
  const signUp = async (email, password, additionalProfileData = {}) => {
    setActionLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data?.user) {
        // Prepare the profile record — only include columns that exist in your schema.
        // Remove or add fields here to match your actual profiles table definition.
        const usernameFallback = email.split('@')[0];

        // Use upsert (not insert) to handle two cases safely:
        //  1. First sign-up → creates the profile row correctly.
        //  2. Re-sign-up / email-confirmation re-attempt with the same email
        //     → updates the row instead of throwing a duplicate key constraint error.
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            [{
              id: data.user.id,
              username: additionalProfileData.username?.trim() || usernameFallback,
              email: email.trim(),
            }],
            { onConflict: 'id' }   // match on primary key
          );

        if (profileError) {
          console.error('Sign up succeeded but profile creation failed:', profileError.message);
          throw new Error(`Auth created, but profile could not be initialized: ${profileError.message}`);
        }
      }

      return { user: data.user, session: data.session };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Log in an existing user using email and password.
   * 
   * @param {string} email 
   * @param {string} password 
   */
  const login = async (email, password) => {
    setActionLoading(true);
    setError(null);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      return { user: data.user, session: data.session };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Sign out the current user.
   */
  const signOut = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    session,
    user,
    loading,        // Initial session loading state
    actionLoading,  // Action (signUp/login/signOut) loading state
    error,          // Error message if an action failed
    signUp,
    login,
    signOut,
  };
}
