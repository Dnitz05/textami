'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase/browserClient';
import { log } from '@/lib/logger';

// COMPLETE GLOBAL AUTH STATE - Replaces all useUser functionality
interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SINGLETON CLIENT - Single instance for entire app
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // AUTH ACTIONS - Available globally
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      log.info('🔍 AuthContext: Sign in successful', { userId: data.user?.id });
      // Auth listener will handle state updates
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      log.info('🔍 AuthContext: Sign up successful', { userId: data.user?.id });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      setLoading(true);
      setError(null);

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw new Error(signOutError.message);
      }

      log.info('🔍 AuthContext: Sign out successful');
      // Auth listener will handle state updates
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [supabase]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // SINGLE AUTH INITIALIZATION
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (!supabase || !mounted) return;

      try {
        log.info('🔧 AuthContext: Initializing global auth state');

        // Get current session
        const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();

        if (mounted) {
          if (getUserError || !currentUser) {
            log.info('🔍 AuthContext: No authenticated user found');
            setUser(null);
            setLoading(false);
          } else {
            log.info('🔍 AuthContext: Authenticated user found', { userId: currentUser.id });
            setUser(currentUser);
            setLoading(false);
          }
        }

        // SINGLE AUTH LISTENER FOR ENTIRE APP
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
          if (!mounted) return;

          log.info('🔍 AuthContext: Auth state change', { event, hasUser: !!session?.user });

          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
            setLoading(false);
            setError(null);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setLoading(false);
            setError(null);
          }
        });

        return () => {
          subscription.unsubscribe();
        };

      } catch (err) {
        log.error('🚨 AuthContext: Auth initialization error', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Auth initialization failed');
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const isAuthenticated = useMemo(() => !!user, [user]);

  const contextValue: AuthContextType = {
    // State
    user,
    isAuthenticated,
    loading,
    error,
    // Actions
    signIn,
    signUp,
    signOut,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// REPLACE useUser WITH THIS
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}