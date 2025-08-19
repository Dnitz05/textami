// lib/auth/permissions.ts
// TEXTAMI AUTH & PERMISSIONS - PRODUCTION SECURITY
// Zero technical debt - strict TypeScript with complete RLS integration
// ALL operations require user_id verification - NO EXCEPTIONS

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AuthError, DatabaseError, ErrorCode } from '@/lib/errors/custom-errors'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Strict typing for database with our custom schema
type SupabaseClient = ReturnType<typeof createServerClient<Database>>

// User profile type from our database schema
export type UserProfile = Database['public']['Tables']['profiles']['Row']

// Resource ownership verification interface
export interface ResourceOwnership {
  userId: string
  resourceId: string
  resourceType: 'templates' | 'data_sources' | 'variable_mappings' | 'generations' | 'usage_logs'
}

// Authentication result with strict typing
export interface AuthResult {
  user: User
  profile: UserProfile
}

// Create server-side Supabase client with proper error handling
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new DatabaseError(
      'Supabase configuration missing',
      ErrorCode.SYS_CONFIGURATION_ERROR,
      500,
      undefined,
      undefined,
      { metadata: { component: 'permissions', function: 'createServerSupabaseClient' } }
    )
  }

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => {
          return cookieStore.getAll()
        },
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `set` method was called from a Server Component
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  return supabase
}

// CORE SECURITY FUNCTION - Require authentication for ALL protected operations
export async function requireAuth(): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      throw AuthError.invalidToken(
        { 
          metadata: { 
            supabaseError: authError.message,
            function: 'requireAuth' 
          } 
        },
        authError
      )
    }

    if (!user) {
      throw AuthError.required({ 
        metadata: { function: 'requireAuth' } 
      })
    }

    // Get user profile from our profiles table (with RLS protection)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw new DatabaseError(
        'Failed to fetch user profile',
        ErrorCode.DB_QUERY_FAILED,
        500,
        'SELECT profiles',
        'profiles',
        { 
          userId: user.id,
          metadata: { 
            supabaseError: profileError.message,
            function: 'requireAuth' 
          }
        },
        profileError
      )
    }

    if (!profile) {
      throw new DatabaseError(
        'User profile not found',
        ErrorCode.DB_RECORD_NOT_FOUND,
        404,
        undefined,
        'profiles',
        { 
          userId: user.id,
          resourceId: user.id,
          metadata: { function: 'requireAuth' }
        }
      )
    }

    // Verify profile is active
    if (!profile.is_active) {
      throw AuthError.permissionDenied(
        'access with inactive account',
        { 
          userId: user.id,
          metadata: { 
            profileStatus: 'inactive',
            function: 'requireAuth' 
          }
        }
      )
    }

    return { user, profile }

  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof AuthError || error instanceof DatabaseError) {
      throw error
    }

    // Wrap unexpected errors
    throw new AuthError(
      'Authentication failed due to system error',
      ErrorCode.SYS_INTERNAL_ERROR,
      500,
      { 
        metadata: { 
          originalError: error instanceof Error ? error.message : 'Unknown error',
          function: 'requireAuth' 
        }
      },
      error instanceof Error ? error : undefined
    )
  }
}

// RESOURCE OWNERSHIP VERIFICATION - Critical security function
export async function checkUserOwnership(
  resourceType: ResourceOwnership['resourceType'],
  resourceId: string,
  userId?: string
): Promise<boolean> {
  try {
    // If no userId provided, get it from current session
    let verifiedUserId = userId
    if (!verifiedUserId) {
      const { user } = await requireAuth()
      verifiedUserId = user.id
    }

    const supabase = await createServerSupabaseClient()

    // Use the database security function we created in our schema
    const { data: ownsResource, error } = await supabase
      .rpc('user_owns_resource', {
        table_name: resourceType,
        resource_id: resourceId,
        user_column: 'user_id'
      })

    if (error) {
      throw new DatabaseError(
        'Failed to verify resource ownership',
        ErrorCode.DB_QUERY_FAILED,
        500,
        'RPC user_owns_resource',
        resourceType,
        {
          userId: verifiedUserId,
          resourceId,
          resourceType,
          metadata: { 
            supabaseError: error.message,
            function: 'checkUserOwnership' 
          }
        },
        error
      )
    }

    return Boolean(ownsResource)

  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof AuthError || error instanceof DatabaseError) {
      throw error
    }

    // Wrap unexpected errors
    throw new DatabaseError(
      'Resource ownership verification failed',
      ErrorCode.SYS_INTERNAL_ERROR,
      500,
      undefined,
      resourceType,
      {
        userId,
        resourceId,
        resourceType,
        metadata: { 
          originalError: error instanceof Error ? error.message : 'Unknown error',
          function: 'checkUserOwnership' 
        }
      },
      error instanceof Error ? error : undefined
    )
  }
}

// ENFORCE RESOURCE OWNERSHIP - Throws error if user doesn't own resource
export async function enforceResourceOwnership(
  resourceType: ResourceOwnership['resourceType'],
  resourceId: string,
  operation: string,
  userId?: string
): Promise<void> {
  const ownsResource = await checkUserOwnership(resourceType, resourceId, userId)
  
  if (!ownsResource) {
    throw AuthError.permissionDenied(
      operation,
      {
        userId,
        resourceId,
        resourceType,
        operation,
        metadata: { function: 'enforceResourceOwnership' }
      }
    )
  }
}

// GET USER CREDIT INFO - With proper error handling
export async function getUserCreditInfo(userId?: string): Promise<{
  credits_used: number
  credits_limit: number
  credits_remaining: number
  plan: string
}> {
  try {
    // If no userId provided, get it from current session
    let verifiedUserId = userId
    if (!verifiedUserId) {
      const { user } = await requireAuth()
      verifiedUserId = user.id
    }

    const supabase = await createServerSupabaseClient()

    // Use the database function we created in our schema
    const { data: creditInfo, error } = await supabase
      .rpc('get_user_credit_info')

    if (error) {
      throw new DatabaseError(
        'Failed to fetch user credit information',
        ErrorCode.DB_QUERY_FAILED,
        500,
        'RPC get_user_credit_info',
        'profiles',
        {
          userId: verifiedUserId,
          metadata: { 
            supabaseError: error.message,
            function: 'getUserCreditInfo' 
          }
        },
        error
      )
    }

    if (!creditInfo || creditInfo.length === 0) {
      throw new DatabaseError(
        'User credit information not found',
        ErrorCode.DB_RECORD_NOT_FOUND,
        404,
        undefined,
        'profiles',
        {
          userId: verifiedUserId,
          metadata: { function: 'getUserCreditInfo' }
        }
      )
    }

    return creditInfo[0]

  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof AuthError || error instanceof DatabaseError) {
      throw error
    }

    // Wrap unexpected errors
    throw new DatabaseError(
      'Credit information retrieval failed',
      ErrorCode.SYS_INTERNAL_ERROR,
      500,
      undefined,
      'profiles',
      {
        userId,
        metadata: { 
          originalError: error instanceof Error ? error.message : 'Unknown error',
          function: 'getUserCreditInfo' 
        }
      },
      error instanceof Error ? error : undefined
    )
  }
}

// DEDUCT USER CREDITS - Secure credit management
export async function deductUserCredits(
  amount: number,
  actionType: string = 'document_generation',
  resourceId?: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  try {
    const { user } = await requireAuth()
    const supabase = await createServerSupabaseClient()

    // Use the database function we created in our schema
    const { data: success, error } = await supabase
      .rpc('deduct_user_credits', {
        amount,
        action_type: actionType,
        resource_id: resourceId || undefined,
        metadata: metadata as any || {}
      })

    if (error) {
      throw new DatabaseError(
        'Failed to deduct user credits',
        ErrorCode.DB_QUERY_FAILED,
        500,
        'RPC deduct_user_credits',
        'profiles',
        {
          userId: user.id,
          resourceId,
          metadata: { 
            amount,
            actionType,
            supabaseError: error.message,
            function: 'deductUserCredits' 
          }
        },
        error
      )
    }

    return Boolean(success)

  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof AuthError || error instanceof DatabaseError) {
      throw error
    }

    // Wrap unexpected errors
    throw new DatabaseError(
      'Credit deduction failed',
      ErrorCode.SYS_INTERNAL_ERROR,
      500,
      undefined,
      'profiles',
      {
        resourceId,
        metadata: { 
          amount,
          actionType,
          originalError: error instanceof Error ? error.message : 'Unknown error',
          function: 'deductUserCredits' 
        }
      },
      error instanceof Error ? error : undefined
    )
  }
}

// VALIDATE TEMPLATE-DATA COMPATIBILITY - Business logic security
export async function validateTemplateDataCompatibility(
  templateId: string,
  dataSourceId: string
): Promise<Record<string, unknown>> {
  try {
    const { user } = await requireAuth()
    const supabase = await createServerSupabaseClient()

    // First verify user owns both resources
    await enforceResourceOwnership('templates', templateId, 'validate compatibility with data source')
    await enforceResourceOwnership('data_sources', dataSourceId, 'validate compatibility with template')

    // Use the database function we created in our schema
    const { data: validation, error } = await supabase
      .rpc('validate_template_data_compatibility', {
        template_id: templateId,
        data_source_id: dataSourceId
      })

    if (error) {
      throw new DatabaseError(
        'Failed to validate template-data compatibility',
        ErrorCode.DB_QUERY_FAILED,
        500,
        'RPC validate_template_data_compatibility',
        'templates',
        {
          userId: user.id,
          resourceId: templateId,
          metadata: { 
            templateId,
            dataSourceId,
            supabaseError: error.message,
            function: 'validateTemplateDataCompatibility' 
          }
        },
        error
      )
    }

    return validation as Record<string, unknown>

  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof AuthError || error instanceof DatabaseError) {
      throw error
    }

    // Wrap unexpected errors
    throw new DatabaseError(
      'Template-data compatibility validation failed',
      ErrorCode.SYS_INTERNAL_ERROR,
      500,
      undefined,
      'templates',
      {
        resourceId: templateId,
        metadata: { 
          templateId,
          dataSourceId,
          originalError: error instanceof Error ? error.message : 'Unknown error',
          function: 'validateTemplateDataCompatibility' 
        }
      },
      error instanceof Error ? error : undefined
    )
  }
}

// PERMISSION MIDDLEWARE HELPER - For API routes
export async function withAuth<T>(
  handler: (authResult: AuthResult) => Promise<T>
): Promise<T> {
  const authResult = await requireAuth()
  return await handler(authResult)
}

// RESOURCE OWNERSHIP MIDDLEWARE HELPER - For API routes
export async function withResourceOwnership<T>(
  resourceType: ResourceOwnership['resourceType'],
  resourceId: string,
  operation: string,
  handler: (authResult: AuthResult) => Promise<T>
): Promise<T> {
  const authResult = await requireAuth()
  await enforceResourceOwnership(resourceType, resourceId, operation, authResult.user.id)
  return await handler(authResult)
}