'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './SessionProvider';

type AuthMode = 'signin' | 'signup';

interface AuthFormProps {
  mode?: AuthMode;
  redirectTo?: string;
  onSuccess?: () => void;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function AuthForm({ 
  mode = 'signin', 
  redirectTo = '/dashboard',
  onSuccess 
}: AuthFormProps) {
  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState('');
  
  const { supabase } = useSession();
  const router = useRouter();

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!email) {
      newErrors.email = 'Email és obligatori';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Format d\'email no vàlid';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Contrasenya és obligatòria';
    } else if (password.length < 6) {
      newErrors.password = 'La contrasenya ha de tenir almenys 6 caràcters';
    }

    return newErrors;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous errors and messages
    setErrors({});
    setMessage('');
    
    // Validate form
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);

    try {
      // Use proxy API to bypass network issues
      const response = await fetch('/api/auth/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: currentMode === 'signin' ? 'signin' : 'signup',
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Authentication failed');
      }

      const { data } = result;

      if (currentMode === 'signin') {
        if (data.user) {
          setMessage('Sessió iniciada correctament!');
          // Refresh the page to update session context
          window.location.href = redirectTo;
        }
      } else {
        // Signup mode
        if (data.user) {
          if (data.user.email_confirmed_at) {
            setMessage('Compte creat i sessió iniciada!');
            window.location.href = redirectTo;
          } else {
            setMessage('Compte creat! Revisa el teu email per confirmar-lo.');
            setCurrentMode('signin');
          }
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Handle specific auth errors
      let errorMessage = 'Ha ocorregut un error inesperat';
      
      if (error.message) {
        switch (error.message) {
          case 'Invalid login credentials':
            errorMessage = 'Credencials incorrectes';
            break;
          case 'User already registered':
            errorMessage = 'Aquest email ja està registrat';
            break;
          case 'Email not confirmed':
            errorMessage = 'Si us plau, confirma el teu email abans de continuar';
            break;
          case 'Failed to fetch':
            errorMessage = 'Error de connexió. Comprova la teva xarxa.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            {currentMode === 'signin' ? 'Iniciar Sessió' : 'Crear Compte'}
          </h2>
          <p className="text-gray-600 text-center mt-2">
            {currentMode === 'signin' 
              ? 'Accedeix al teu compte Textami' 
              : 'Crea el teu compte Textami'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="el-teu-email@exemple.com"
              disabled={loading}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contrasenya
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Mínim 6 caràcters"
              disabled={loading}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-green-600 text-sm">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processant...' : (
              currentMode === 'signin' ? 'Iniciar Sessió' : 'Crear Compte'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setCurrentMode(currentMode === 'signin' ? 'signup' : 'signin');
              setErrors({});
              setMessage('');
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            disabled={loading}
          >
            {currentMode === 'signin' 
              ? 'No tens compte? Crear compte' 
              : 'Ja tens compte? Iniciar sessió'
            }
          </button>
        </div>
      </div>
    </div>
  );
}