'use client';

import React, { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { log } from '@/lib/logger';
import GoogleAuthButton from '@/components/google/GoogleAuthButton';

type AuthMode = 'login' | 'signup';

interface AuthFormProps {
  onSuccess?: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const { signIn, signUp, user, loading: authLoading } = useUser();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showAlternative, setShowAlternative] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showGoogleConnect, setShowGoogleConnect] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    log.debug('🔥 AUTHFORM DEBUG: Starting auth process', { mode, email });

    try {
      if (mode === 'login') {
        log.debug('🔥 AUTHFORM DEBUG: Attempting sign in with:', { email, passwordLength: password.length });
        await signIn(email, password);
        log.debug('🔥 AUTHFORM DEBUG: Sign in completed successfully');
        setMessage('Sessió iniciada correctament!');
        
        // Show Google Drive connection option after successful login
        log.debug('🔥 AUTHFORM DEBUG: Showing Google Drive connection option');
        setShowGoogleConnect(true);
        
      } else {
        log.debug('🔥 AUTHFORM DEBUG: Attempting sign up with:', { email, passwordLength: password.length });
        await signUp(email, password);
        log.debug('🔥 AUTHFORM DEBUG: Sign up completed successfully');
        setMessage('Compte creat correctament! Comprova el teu email per verificar el compte.');
        
        // Show Google Drive connection option after successful signup
        log.debug('🔥 AUTHFORM DEBUG: Showing Google Drive connection option');
        setShowGoogleConnect(true);
      }
    } catch (err) {
      log.error('🔥 AUTHFORM DEBUG: Auth error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconegut';
      setError(errorMessage);
    } finally {
      setLoading(false);
      log.debug('🔥 AUTHFORM DEBUG: Auth process completed, loading set to false');
    }
  };

  // Show Google Drive connection option after successful auth
  if (user && showGoogleConnect) {
    return (
      <div className="text-center space-y-6">
        <div className="text-green-600 mb-4">
          ✅ Autenticació exitosa!
        </div>
        <p className="text-gray-600 mb-6">
          Benvingut, {user.email?.split('@')[0]}!
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connecta Google Drive</h3>
              <p className="text-sm text-gray-600">Accedeix als teus documents i fulls de càlcul</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <GoogleAuthButton onConnectionChange={(connected) => {
              if (connected) {
                // Close modal and go to dashboard after successful connection
                setTimeout(() => {
                  onSuccess?.();
                }, 1000);
              }
            }} />
            
            <button
              onClick={() => {
                // Skip Google Drive connection and go to dashboard
                onSuccess?.();
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Ometre per ara (pots connectar més tard)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success message if user is authenticated but not showing Google connect
  if (user) {
    return (
      <div className="text-center">
        <div className="text-green-600 mb-4">
          ✅ Autenticació exitosa!
        </div>
        <p className="text-gray-600">
          Benvingut, {user.email}
        </p>
      </div>
    );
  }

  // Check for Google account connection (simulating detection)
  // This is a placeholder; actual logic might depend on cookies or token presence
  const googleConnected = localStorage.getItem('oauth_redirected') === 'true' || document.cookie.includes('google_auth_user_id');
  if (googleConnected) {
    log.info('🔍 AUTHFORM DEBUG - Google account detected as connected, redirecting to dashboard');
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
    return (
      <div className="text-center">
        <div className="text-blue-600 mb-4">
          🔄 Redirigint al dashboard...
        </div>
        <p className="text-gray-600">
          Compte de Google detectat com a connectat.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Main Google Sign-In */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Comença amb DocMile</h2>
        <p className="text-gray-600 mb-6">
          Connecta el teu compte de Google per accedir a tots els serveis
        </p>
        
        <div className="space-y-4">
          <GoogleAuthButton />
          <div className="text-xs text-gray-500 space-y-2">
            <div className="flex items-center justify-center space-x-4 text-green-600">
              <div className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Autenticació
              </div>
              <div className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Google Drive
              </div>
              <div className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Docs + Sheets
              </div>
            </div>
            <p className="text-gray-400">
              Un sol clic per configurar-ho tot automàticament
            </p>
          </div>
        </div>
      </div>

      {/* Alternative Email/Password Section */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <button
            onClick={() => setShowAlternative(!showAlternative)}
            className="px-4 bg-white text-gray-500 hover:text-gray-700"
          >
            {showAlternative ? 'Amagar opcions alternatives' : 'O utilitza email/contrasenya'}
          </button>
        </div>
      </div>

      {showAlternative && (
        <>
          {/* Mode Toggle */}
          <div className="flex mt-6 mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Iniciar Sessió
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Registrar-se
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="el-teu-email@exemple.com"
          />
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contrasenya
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Mínim 8 caràcters"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
            {message}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || authLoading}
          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading || authLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              {mode === 'login' ? 'Iniciant sessió...' : 'Registrant...'}
            </div>
          ) : (
            mode === 'login' ? 'Iniciar Sessió' : 'Registrar-se'
          )}
        </button>
          </form>

          {/* Footer for alternative auth */}
          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <p>
                No tens compte?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Registra't aquí
                </button>
              </p>
            ) : (
              <p>
                Ja tens compte?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Inicia sessió aquí
                </button>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AuthForm;
