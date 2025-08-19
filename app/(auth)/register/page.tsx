// app/(auth)/register/page.tsx
// TEXTAMI REGISTER PAGE - PRODUCTION-READY USER REGISTRATION
// Zero technical debt - complete validation and error handling
// Strict TypeScript with comprehensive UX and security considerations

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { ValidationError, AuthError, getUserFriendlyMessage } from '@/lib/errors/custom-errors'

// Form data interface with strict typing
interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  agreedToTerms: boolean
}

// Form errors interface
interface RegisterFormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  fullName?: string
  agreedToTerms?: string
  general?: string
}

// Password strength interface
interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
}

// Initial form state
const initialFormData: RegisterFormData = {
  email: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  agreedToTerms: false
}

// Initial errors state
const initialErrors: RegisterFormErrors = {}

// Password strength checker
const checkPasswordStrength = (password: string): PasswordStrength => {
  const feedback: string[] = []
  let score = 0

  if (password.length < 8) {
    feedback.push('At least 8 characters')
  } else {
    score += 1
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('At least one uppercase letter')
  } else {
    score += 1
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('At least one lowercase letter')
  } else {
    score += 1
  }

  if (!/[0-9]/.test(password)) {
    feedback.push('At least one number')
  } else {
    score += 1
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    feedback.push('At least one special character')
  } else {
    score += 1
  }

  return {
    score,
    feedback,
    isValid: score >= 3 // Require at least 3 out of 5 criteria
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, loading, error, isAuthenticated, clearError } = useUser()

  // Form state
  const [formData, setFormData] = useState<RegisterFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<RegisterFormErrors>(initialErrors)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false)

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, router])

  // Clear errors when form changes
  useEffect(() => {
    if (error) {
      clearError()
    }
    setFormErrors({})
  }, [formData, error, clearError])

  // Update password strength when password changes
  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(checkPasswordStrength(formData.password))
    } else {
      setPasswordStrength(null)
    }
  }, [formData.password])

  // Form validation
  const validateForm = (): boolean => {
    const errors: RegisterFormErrors = {}

    // Full name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters'
    } else if (formData.fullName.trim().length > 100) {
      errors.fullName = 'Full name must be less than 100 characters'
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email address'
      } else if (formData.email.length > 255) {
        errors.email = 'Email address is too long'
      }
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else {
      const strength = checkPasswordStrength(formData.password)
      if (!strength.isValid) {
        errors.password = `Password must include: ${strength.feedback.join(', ')}`
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    // Terms agreement validation
    if (!formData.agreedToTerms) {
      errors.agreedToTerms = 'You must agree to the terms and conditions'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form input changes
  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'agreedToTerms' ? e.target.checked : e.target.value
    
    setFormData(prev => ({
      ...prev,
      [field]: value
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

      await signUp(
        formData.email.trim(),
        formData.password,
        formData.fullName.trim()
      )
      
      // Registration successful
      setRegistrationSuccess(true)
      
    } catch (error) {
      const friendlyMessage = getUserFriendlyMessage(error instanceof Error ? error : new Error('Registration failed'))
      
      if (error instanceof AuthError) {
        if (error.message.includes('User already registered')) {
          setFormErrors({ email: 'An account with this email already exists' })
        } else {
          setFormErrors({ general: friendlyMessage })
        }
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

  // Show success state
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Check your email
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              We've sent a confirmation link to <strong>{formData.email}</strong>
            </p>
            <p className="mt-4 text-center text-sm text-gray-600">
              Please click the link in the email to verify your account and complete your registration.
            </p>
            <div className="mt-6">
              <Link 
                href="/login"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your Textami account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Start generating professional documents today
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
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 relative">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                    formErrors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleInputChange('fullName')}
                  disabled={isSubmitting || loading}
                />
              </div>
              {formErrors.fullName && (
                <p className="mt-1 text-sm text-red-600">{formErrors.fullName}</p>
              )}
            </div>

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
                  autoComplete="new-password"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                    formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Create a strong password"
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
              
              {/* Password Strength Indicator */}
              {passwordStrength && formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="h-1 bg-gray-200 rounded overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            passwordStrength.score <= 1 ? 'bg-red-500' :
                            passwordStrength.score <= 2 ? 'bg-yellow-500' :
                            passwordStrength.score <= 3 ? 'bg-blue-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.score <= 1 ? 'text-red-500' :
                      passwordStrength.score <= 2 ? 'text-yellow-500' :
                      passwordStrength.score <= 3 ? 'text-blue-500' :
                      'text-green-500'
                    }`}>
                      {passwordStrength.score <= 1 ? 'Weak' :
                       passwordStrength.score <= 2 ? 'Fair' :
                       passwordStrength.score <= 3 ? 'Good' :
                       'Strong'}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <p className="mt-1 text-xs text-gray-600">
                      Password should include: {passwordStrength.feedback.join(', ')}
                    </p>
                  )}
                </div>
              )}
              
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                    formErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  disabled={isSubmitting || loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting || loading}
                >
                  <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showConfirmPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                  </svg>
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms Agreement */}
            <div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="agreedToTerms"
                    name="agreedToTerms"
                    type="checkbox"
                    required
                    className={`focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded ${
                      formErrors.agreedToTerms ? 'border-red-300' : ''
                    }`}
                    checked={formData.agreedToTerms}
                    onChange={handleInputChange('agreedToTerms')}
                    disabled={isSubmitting || loading}
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="agreedToTerms" className="text-sm text-gray-700">
                    I agree to the{' '}
                    <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-500">
                      Terms and Conditions
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-500">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>
              {formErrors.agreedToTerms && (
                <p className="mt-1 text-sm text-red-600">{formErrors.agreedToTerms}</p>
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
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </div>

          {/* Links */}
          <div className="text-center">
            <Link 
              href="/login" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
            >
              Already have an account? Sign in
            </Link>
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