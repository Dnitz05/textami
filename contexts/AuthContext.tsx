'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase/browserClient';
import { log } from '@/lib/logger';

// SINGLE GLOBAL AUTH STATE - No more multiple useUser instances!
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SINGLETON CLIENT
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

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
    user,
    isAuthenticated,
    loading,
    error
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