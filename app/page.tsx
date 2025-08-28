'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import AuthForm from '@/components/AuthForm';
import { useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useUser();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated && user && !loading) {
      console.log('🎯 Authenticated user detected, redirecting to dashboard...', { 
        user: user.email, 
        isAuthenticated, 
        loading 
      });
      setRedirecting(true);
      // Use Next.js router for proper navigation
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, loading, router]);

  // Show loading state during auth check or redirect
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregant...</p>
        </div>
      </div>
    );
  }

  // Show redirecting state
  if (redirecting || (isAuthenticated && user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigint al dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">textami</span>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAuthForm(true)}
                className="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => setShowAuthForm(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md hover:shadow-lg"
              >
                Començar Gratis
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            🧠 Intel·ligència Artificial
            <br />
            <span className="text-blue-600">per a Documents</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transforma plantilles Word i dades Excel en documents personalitzats amb 
            <strong className="text-blue-600"> zero configuració manual</strong>. 
            La nostra IA analitza, mapeja i genera documents automàticament.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => setShowAuthForm(true)}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
          >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Començar Ara - És Gratis
          </button>

          <p className="text-sm text-gray-500 mt-4">
            ✅ Sense targeta de crèdit • ✅ Configuració instantània • ✅ Powered by GPT-5
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Característiques Intel·ligents
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-8 rounded-xl bg-blue-50 border border-blue-100 hover:shadow-lg transition-shadow">
              <div className="text-6xl mb-6">📄</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Anàlisi Automàtic</h3>
              <p className="text-gray-600">
                Puja documents PDF i deixa que la IA detecti automàticament variables, 
                estructura i camps de dades sense configuració manual.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-8 rounded-xl bg-green-50 border border-green-100 hover:shadow-lg transition-shadow">
              <div className="text-6xl mb-6">🤖</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Mapping Intel·ligent</h3>
              <p className="text-gray-600">
                Conecta dades Excel amb plantilles de forma automàtica. 
                La IA proposa mappings intel·ligents amb alta precisió.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-8 rounded-xl bg-purple-50 border border-purple-100 hover:shadow-lg transition-shadow">
              <div className="text-6xl mb-6">⚡</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Generació Massiva</h3>
              <p className="text-gray-600">
                Genera centenars de documents personalitzats en minuts, 
                mantenint format professional i consistència perfecta.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-4 bg-white rounded-lg p-4 shadow-sm">
            <span className="text-blue-600 font-medium">🧠 Powered by GPT-5</span>
            <span className="text-purple-600 font-medium">⚡ Zero Configuration</span>
            <span className="text-green-600 font-medium">🚀 AI-First Platform</span>
          </div>
        </div>
      </div>

      {/* Auth Form Modal */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Comença amb Textami</h2>
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
              <AuthForm onSuccess={() => setShowAuthForm(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}