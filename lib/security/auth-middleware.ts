// lib/security/auth-middleware.ts
// Secure authentication middleware for Google API endpoints
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { log } from '../logger';
import { hashForLogging } from './encryption';

// Initialize Supabase client lazily
let supabaseClient: any = null;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseClient;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  sessionId?: string;
}

export interface AuthMiddlewareOptions {
  requiredRole?: string;
  allowAnonymous?: boolean;
  logAccess?: boolean;
}

/**
 * Validate user session and extract user info
 */
export async function validateUserSession(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<{
  user: AuthenticatedUser | null;
  error?: string;
  response?: NextResponse;
}> {
  try {
    // Extract authorization header
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('sb-access-token');
    
    if (!authHeader && !sessionCookie && !options.allowAnonymous) {
      log.security('Missing authentication credentials - unauthorized access attempt:', {
        path: request.nextUrl.pathname,
        method: request.method,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent')?.substring(0, 100)
      });
      
      return {
        user: null,
        error: 'Authentication required',
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }

    if (options.allowAnonymous && !authHeader && !sessionCookie) {
      return { user: null };
    }

    const supabase = getSupabaseClient();
    
    // Extract token from header or cookie
    let token: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (sessionCookie) {
      token = sessionCookie.value;
    }

    if (!token) {
      return {
        user: null,
        error: 'Invalid authentication format',
        response: NextResponse.json(
          { error: 'Invalid authentication format' },
          { status: 401 }
        )
      };
    }

    // Validate token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      log.security('Token validation failed - invalid session:', {
        error: authError?.message,
        tokenHash: token ? hashForLogging(token) : undefined,
        path: request.nextUrl.pathname,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      });

      return {
        user: null,
        error: 'Invalid or expired token',
        response: NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        )
      };
    }

    // Get additional user info
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, plan')
      .eq('id', user.id)
      .single();

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email || '',
      role: profile?.role || 'user',
      sessionId: hashForLogging(token)
    };

    // Check role requirements
    if (options.requiredRole && authenticatedUser.role !== options.requiredRole) {
      log.security('Insufficient permissions - access denied:', {
        userId: hashForLogging(user.id),
        userRole: authenticatedUser.role,
        requiredRole: options.requiredRole,
        path: request.nextUrl.pathname,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      });

      return {
        user: null,
        error: 'Insufficient permissions',
        response: NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      };
    }

    // Log successful access if requested
    if (options.logAccess) {
      log.audit('authenticated_access', user.id, {
        email: user.email,
        path: request.nextUrl.pathname,
        method: request.method,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        sessionId: authenticatedUser.sessionId
      });
    }

    return { user: authenticatedUser };

  } catch (error) {
    log.error('Authentication middleware error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: request.nextUrl.pathname,
      method: request.method
    });

    return {
      user: null,
      error: 'Authentication system error',
      response: NextResponse.json(
        { error: 'Authentication system error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Validate that user ID in request matches authenticated user
 */
export function validateUserOwnership(
  requestUserId: string,
  authenticatedUser: AuthenticatedUser
): { valid: boolean; error?: string; response?: NextResponse } {
  if (requestUserId !== authenticatedUser.id) {
    log.warn('User ownership validation failed:', {
      requestUserId: hashForLogging(requestUserId),
      authenticatedUserId: hashForLogging(authenticatedUser.id),
      sessionId: authenticatedUser.sessionId
    });

    return {
      valid: false,
      error: 'Access denied - user mismatch',
      response: NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    };
  }

  return { valid: true };
}

/**
 * Extract and validate request body with schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  requiredFields: (keyof T)[]
): Promise<{
  body: Partial<T> | null;
  error?: string;
  response?: NextResponse;
}> {
  try {
    const body = await request.json();
    
    // Check required fields
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      log.warn('Request validation failed - missing fields:', {
        missingFields,
        providedFields: Object.keys(body),
        path: request.nextUrl.pathname
      });

      return {
        body: null,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        response: NextResponse.json(
          { error: `Missing required fields: ${missingFields.join(', ')}` },
          { status: 400 }
        )
      };
    }

    return { body };

  } catch (parseError) {
    log.warn('Request body parse error:', {
      error: parseError instanceof Error ? parseError.message : 'Parse failed',
      path: request.nextUrl.pathname
    });

    return {
      body: null,
      error: 'Invalid JSON body',
      response: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    };
  }
}

/**
 * Rate limiting check (basic implementation)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): { allowed: boolean; response?: NextResponse } {
  // This is a basic in-memory rate limiter
  // In production, use Redis or similar
  
  const now = Date.now();
  const key = `rate_limit_${identifier}`;
  
  // Get or create rate limit data
  const rateLimitData = global[key as keyof typeof global] as {
    requests: number[];
  } || { requests: [] };
  
  // Clean old requests outside window
  rateLimitData.requests = rateLimitData.requests.filter(
    time => now - time < windowMs
  );
  
  // Check if limit exceeded
  if (rateLimitData.requests.length >= limit) {
    log.security('Rate limit exceeded - potential abuse:', {
      identifier: hashForLogging(identifier),
      limit,
      current: rateLimitData.requests.length,
      windowMs
    });

    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    };
  }

  // Add current request
  rateLimitData.requests.push(now);
  (global as any)[key] = rateLimitData;
  
  return { allowed: true };
}