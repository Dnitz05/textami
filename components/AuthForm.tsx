'use client';

import React, { useState } from 'react';
import { useUser } from '@/hooks/useUser';

type AuthMode = 'login' | 'signup';

const AuthForm: React.FC = () => {
  const { signIn, signUp, user, loading: authLoading } = useUser();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        console.log('Intentant iniciar sessió amb:', { email, passwordLength: password.length });
        await signIn(email, password);
        setMessage('Sessió iniciada correctament!');
      } else {
        console.log('Intentant registrar usuari amb:', { email, passwordLength: password.length });
        await signUp(email, password);
        setMessage('Compte creat correctament! Comprova el teu email per verificar el compte.');
      }
    } catch (err) {
      console.error('Error d\'autenticació:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconegut';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show success message if user is authenticated
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

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Mode Toggle */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
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

      {/* Footer */}
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
    </div>
  );
};

export default AuthForm;