'use client';

// Force dynamic rendering to avoid SSR issues with Supabase
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { useUser } from '@/hooks/useUser';
import { createBrowserSupabaseClient } from '@/lib/supabase/browserClient';

export default function LandingPage() {
  const router = useRouter();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const { isAuthenticated, loading } = useUser();
  
  // Process magic link authentication on page load
  useEffect(() => {
    const handleMagicLinkAuth = async () => {
      // Check if URL contains magic link tokens (in hash fragment)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          console.log('🔗 Magic link detected, processing authentication...');
          
          try {
            const supabase = createBrowserSupabaseClient();
            if (supabase) {
              // Set the session with the tokens from magic link
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              
              if (error) {
                console.error('❌ Error setting session:', error);
              } else {
                console.log('✅ Session set successfully:', data);
                // Clean up URL hash
                window.location.hash = '';
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            }
          } catch (error) {
            console.error('❌ Error processing magic link:', error);
          }
        }
      }
    };

    handleMagicLinkAuth();
  }, []);
  
  // TEMPORARILY DISABLED - Manual navigation to avoid redirect loops
  useEffect(() => {
    console.log('🔍 Landing auth debug:', { isAuthenticated, loading });
    // Redirect logic disabled to prevent loops - users can manually click "Go to Dashboard"
  }, [isAuthenticated, loading, router]);

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center justify-center py-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="140" height="42" viewBox="0 0 320 120" className="flex-shrink-0">
                <g>
                  <rect x="10"  y="18"  width="18" height="18" rx="2" fill="black"/>
                  <rect x="36"  y="18"  width="18" height="18" rx="2" fill="black"/>
                  <rect x="62"  y="18"  width="18" height="18" rx="2" fill="#2563EB"/>

                  <rect x="10"  y="44"  width="18" height="18" rx="2" fill="black"/>
                  <rect x="36"  y="44"  width="18" height="18" rx="2" fill="#2563EB"/>
                  <rect x="62"  y="44"  width="18" height="18" rx="2" fill="black"/>

                  <rect x="10"  y="70"  width="18" height="18" rx="2" fill="#2563EB"/>
                  <rect x="36"  y="70"  width="18" height="18" rx="2" fill="black"/>
                  <rect x="62"  y="70"  width="18" height="18" rx="2" fill="black"/>
                </g>

                <g stroke="#2563EB" stroke-width="3" fill="none">
                  <line x1="71" y1="27" x2="45" y2="53"/>
                  <line x1="19" y1="79" x2="45" y2="53"/>
                </g>

                <text x="100" y="68" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="52" font-weight="700">
                  <tspan fill="#2563EB">doc</tspan><tspan fill="#2D3748">mile</tspan>
                </text>
              </svg>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-md hover:shadow-lg"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowAuthForm(true)}
                    className="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => setShowAuthForm(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md hover:shadow-lg"
                  >
                    Get Started Free
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-16 px-4 flex-1 flex flex-col justify-center">
        <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              🧠 Artificial Intelligence
              <br />
              <span className="text-blue-600">for Documents</span>
            </h1>
          
            <p className="text-lg lg:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform Word templates and Excel data into personalized documents with 
              <strong className="text-blue-600"> zero manual configuration</strong>. 
              Our AI analyzes, maps, and generates documents automatically.
            </p>

          {/* CTA Button */}
          <button
            onClick={() => window.location.href = '/api/auth/google/signin'}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 mb-4"
          >
            <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
              <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Un sol clic configura: <strong>Compte + Google Drive + Docs + Sheets</strong>
          </p>
          
          <button
            onClick={() => setShowAuthForm(true)}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
          >
            O utilitza email/contrasenya
          </button>
        </div>

        {/* Features Section - Compactada */}
        <div className="max-w-5xl mx-auto px-4 mt-12">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="text-center p-4 rounded-xl bg-blue-50 border border-blue-100 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">📄</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Automatic Analysis</h3>
              <p className="text-sm text-gray-600">
                Modification and improvement of documents in seconds, with AI.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-4 rounded-xl bg-green-50 border border-green-100 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">🤖</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Intelligent Mapping</h3>
              <p className="text-sm text-gray-600">
                Connect Excel data with templates automatically with high precision.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-4 rounded-xl bg-purple-50 border border-purple-100 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Mass Generation</h3>
              <p className="text-sm text-gray-600">
                Generate hundreds of personalized documents while maintaining professional format.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof - Simplified */}
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-4 bg-white rounded-lg p-3 shadow-sm">
            <span className="text-blue-600 font-medium text-sm">🧠 Powered by GPT-5</span>
            <span className="text-purple-600 font-medium text-sm">⚡ Zero Configuration</span>
            <span className="text-green-600 font-medium text-sm">🚀 AI-First Platform</span>
          </div>
        </div>
      </div>

      {/* Auth Form Modal */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Get Started with DocMile</h2>
              <button
                onClick={() => setShowAuthForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <AuthForm onSuccess={() => {
                setShowAuthForm(false);
                router.push('/dashboard');
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
