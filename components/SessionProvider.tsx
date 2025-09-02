// components/SessionProvider.tsx
'use client'
import { useState, createContext, useContext, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient, User } from '@supabase/supabase-js'
import { handleOAuthCallback } from '@/hooks/useGoogleOAuth'

interface SessionContextType {
  supabase: SupabaseClient;
  user: User | null;
  loading: boolean;
}

// Create a typed context for the Supabase client and session
const SessionContext = createContext<SessionContextType | null>(null)

// Hook for components to easily access the Supabase client and session
export const useSession = () => {
  const context = useContext(SessionContext)
  if (context === null) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

// Backward compatibility
export const useSupabase = () => {
  return useSession().supabase
}

export default function SessionProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // Create the Supabase client with SSR support
  const [supabase] = useState(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle OAuth callback if present
    handleOAuthCallback()

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        }
        
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email)
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <SessionContext.Provider value={{ supabase, user, loading }}>
      {children}
    </SessionContext.Provider>
  )
}