// app/(auth)/login/page.tsx
// TEXTAMI LOGIN PAGE - PRODUCTION-READY AUTHENTICATION
// Zero technical debt - complete validation and error handling
// Strict TypeScript with comprehensive UX considerations

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { ValidationError, AuthError, getUserFriendlyMessage } from '@/lib/errors/custom-errors'

// Form data interface with strict typing
interface LoginFormData {
  email: string
  password: string
}

// Form errors interface
interface LoginFormErrors {
  email?: string
  password?: string
  general?: string
}

// Initial form state
const initialFormData: LoginFormData = {
  email: '',
  password: ''
}

// Initial errors state
const initialErrors: LoginFormErrors = {}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, loading, error, isAuthenticated, clearError } = useUser()

  // Form state
  const [formData, setFormData] = useState<LoginFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<LoginFormErrors>(initialErrors)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)

  // URL parameters
  const redirectTo = searchParams?.get('redirect') || '/dashboard'
  const urlError = searchParams?.get('error')

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo)
    }
  }, [isAuthenticated, router, redirectTo])

  // Handle URL errors
  useEffect(() => {
    if (urlError) {
      const errorMessages = {
        'profile_error': 'There was an issue accessing your profile. Please try logging in again.',
        'account_inactive': 'Your account is inactive. Please contact support.',
        'auth_failed': 'Authentication failed. Please try again.',
        'system_error': 'A system error occurred. Please try again.',
      }
      
      setFormErrors({
        general: errorMessages[urlError as keyof typeof errorMessages] || 'An error occurred. Please try logging in.'
      })
    }
  }, [urlError])

  // Clear errors when form changes
  useEffect(() => {
    if (error) {
      clearError()
    }
    setFormErrors({})
  }, [formData, error, clearError])

  // Form validation
  const validateForm = (): boolean => {
    const errors: LoginFormErrors = {}

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email address'
      }
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form input changes
  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || isSubmitting || loading) {
      return
    }

    try {
      setIsSubmitting(true)
      setFormErrors({})

      await signIn(formData.email.trim(), formData.password)
      
      // Success - user will be redirected by useEffect
      
    } catch (error) {
      const friendlyMessage = getUserFriendlyMessage(error instanceof Error ? error : new Error('Login failed'))
      
      if (error instanceof AuthError) {
        setFormErrors({ general: friendlyMessage })
      } else if (error instanceof ValidationError) {
        if (error.field === 'email') {
          setFormErrors({ email: friendlyMessage })
        } else if (error.field === 'password') {
          setFormErrors({ password: friendlyMessage })
        } else {
          setFormErrors({ general: friendlyMessage })
        }
      } else {
        setFormErrors({ general: 'An unexpected error occurred. Please try again.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state for authenticated users
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Textami
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Professional document generation made simple
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          {/* General Error */}
          {(formErrors.general || error) && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {formErrors.general || (error && getUserFriendlyMessage(error))}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                    formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  disabled={isSubmitting || loading}
                />
                {formErrors.email && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                    formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  disabled={isSubmitting || loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting || loading}
                >
                  <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                  </svg>
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {(isSubmitting || loading) ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Links */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link 
                href="/register" 
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                Don't have an account? Sign up
              </Link>
            </div>
            
            <div className="text-sm">
              <Link 
                href="/forgot-password" 
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}