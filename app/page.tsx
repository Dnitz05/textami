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
  
  // Redirect authenticated users to dashboard with delay to prevent flickering
  useEffect(() => {
    console.log('🔍 Landing auth debug:', { isAuthenticated, loading });
    if (!loading && isAuthenticated) {
      console.log('🔄 Redirecting to dashboard - authenticated');
      // Small delay to prevent rapid state changes causing flickering
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    }
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
                  <rect x="62"  y="18"  width="18" height="18" rx="2" fill="#60A5FA"/>

                  <rect x="10"  y="44"  width="18" height="18" rx="2" fill="black"/>
                  <rect x="36"  y="44"  width="18" height="18" rx="2" fill="#60A5FA"/>
                  <rect x="62"  y="44"  width="18" height="18" rx="2" fill="black"/>

                  <rect x="10"  y="70"  width="18" height="18" rx="2" fill="#60A5FA"/>
                  <rect x="36"  y="70"  width="18" height="18" rx="2" fill="black"/>
                  <rect x="62"  y="70"  width="18" height="18" rx="2" fill="black"/>
                </g>

                <g stroke="#60A5FA" stroke-width="3" fill="none">
                  <line x1="71" y1="27" x2="45" y2="53"/>
                  <line x1="19" y1="79" x2="45" y2="53"/>
                </g>

                <text x="100" y="68" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="52" font-weight="700" fill="#2D3748">
                  docmile
                </text>
              </svg>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
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
            onClick={() => setShowAuthForm(true)}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 mb-4"
          >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Start Now - It's Free
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
