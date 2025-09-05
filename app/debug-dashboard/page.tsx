'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browserClient';

export default function DebugDashboard() {
  const [authState, setAuthState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createBrowserSupabaseClient();
        if (!supabase) {
          setError('Supabase client not available');
          setLoading(false);
          return;
        }

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError(`Session error: ${sessionError.message}`);
        } else {
          setAuthState({
            hasSession: !!session,
            user: session?.user ? {
              id: session.user.id,
              email: session.user.email,
              created_at: session.user.created_at,
              last_sign_in_at: session.user.last_sign_in_at
            } : null,
            sessionExpiry: session?.expires_at,
            accessToken: session?.access_token ? 'present' : 'missing'
          });
        }

        setLoading(false);
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Debug Dashboard</h1>
        
        <div className="bg-white rounded-lg p-6 shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication State</h2>
          
          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          ) : authState ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <strong>Has Session:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    authState.hasSession ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {authState.hasSession ? 'YES' : 'NO'}
                  </span>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <strong>Access Token:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    authState.accessToken === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {authState.accessToken}
                  </span>
                </div>
              </div>
              
              {authState.user ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded">
                  <h3 className="font-semibold text-green-800 mb-2">✅ User Information</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>ID:</strong> {authState.user.id}</div>
                    <div><strong>Email:</strong> {authState.user.email}</div>
                    <div><strong>Created:</strong> {new Date(authState.user.created_at).toLocaleString()}</div>
                    <div><strong>Last Sign In:</strong> {authState.user.last_sign_in_at ? new Date(authState.user.last_sign_in_at).toLocaleString() : 'Never'}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                  <h3 className="font-semibold text-yellow-800 mb-2">⚠️ No User Data</h3>
                  <p className="text-sm">Session exists but no user information available.</p>
                </div>
              )}
              
              {authState.sessionExpiry && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                  <h3 className="font-semibold text-blue-800 mb-2">📅 Session Info</h3>
                  <div className="text-sm">
                    <div><strong>Expires:</strong> {new Date(authState.sessionExpiry * 1000).toLocaleString()}</div>
                    <div><strong>Time Until Expiry:</strong> {Math.round((authState.sessionExpiry * 1000 - Date.now()) / 1000 / 60)} minutes</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No authentication state available.</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.href = '/dashboard'} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Real Dashboard
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}