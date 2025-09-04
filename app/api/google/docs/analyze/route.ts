import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createGoogleDocsService } from '@/lib/google/docs-service';
import { validateUserSession, checkRateLimit } from '@/lib/security/auth-middleware';
import { validateRequestSchema, validateGoogleDocId, validateFilename } from '@/lib/security/input-validation';
import { getValidGoogleTokens } from '@/lib/google/token-manager';
import { log } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  log.debug('🚀 Google Docs Analysis Request Started');
  
  try {
    // 1. Validate user session and authentication
    const { user, error: authError, response: authResponse } = await validateUserSession(
      request,
      { logAccess: true }
    );
    
    if (authError || !user) {
      return authResponse!;
    }
    
    // 2. Rate limiting check
    const { allowed, response: rateLimitResponse } = checkRateLimit(
      user.id,
      5, // 5 requests per minute for Google API
      60000
    );
    
    if (!allowed) {
      return rateLimitResponse!;
    }
    
    // 3. Validate and sanitize request body
    const requestBody = await request.json();
    const { isValid, errors, sanitizedData } = validateRequestSchema(requestBody, {
      documentId: {
        required: true,
        validator: validateGoogleDocId
      },
      fileName: {
        required: false,
        validator: validateFilename
      },
      templateId: {
        required: false,
        validator: (value) => typeof value === 'string' || value === undefined
      }
    });
    
    if (!isValid) {
      log.warn('Request validation failed:', { errors, userId: user.id });
      return NextResponse.json(
        { error: 'Invalid request data', details: errors },
        { status: 400 }
      );
    }
    
    const { documentId, fileName } = sanitizedData!;
    
    // Ensure documentId is a string (should be guaranteed by validation)
    if (typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid document ID type' },
        { status: 400 }
      );
    }
    
    // Ensure fileName is string or undefined
    const safeFileName = (typeof fileName === 'string' && fileName.trim()) ? fileName : undefined;
    
    log.debug('📋 Request parameters:', { documentId, userId: user.id, fileName });

    // 4. Get valid Google tokens (with automatic refresh)
    const googleTokens = await getValidGoogleTokens(user.id);
    
    if (!googleTokens) {
      log.error('❌ User Google tokens not found or expired:', { userId: user.id });
      return NextResponse.json(
        { error: 'Google authentication required - please reconnect your Google account' },
        { status: 401 }
      );
    }
    
    log.debug('✅ Valid Google tokens retrieved for user:', { userId: user.id });

    // 5. Create Google Docs service with user tokens
    let docsService;
    try {
      docsService = await createGoogleDocsService(
        googleTokens,
        async (newTokens) => {
          // Token refresh is handled by token-manager automatically
          log.debug('🔄 Google tokens refreshed automatically');
        }
      );
    } catch (serviceError) {
      log.error('❌ Failed to create Google Docs service:', serviceError);
      throw new Error(`Google Docs service initialization failed: ${serviceError instanceof Error ? serviceError.message : 'Unknown error'}`);
    }

    // 6. Get document content from Google Docs API
    log.debug('📄 Fetching document content from Google Docs...');
    
    let docResult;
    try {
      docResult = await docsService.parseDocumentContent(documentId, {
        preserveFormatting: true,
        convertToSemantic: true,
        removeEmptyElements: true,
      });
    } catch (parseError) {
      log.error('❌ Failed to parse document content:', parseError);
      throw new Error(`Document parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
    }

    if (!docResult.cleanedHtml) {
      throw new Error('Failed to extract HTML content from Google Doc');
    }

    log.debug('✅ Document content extracted:', {
      htmlLength: docResult.html.length,
      cleanedLength: docResult.cleanedHtml.length,
      headings: docResult.structure.headings.length,
      tables: docResult.structure.tables.length,
    });

    // 7. Generate template ID as a UUID
    const templateId = uuidv4();

    // 8. Use content directly from Google Docs - NO AI NEEDED for transcription
    log.debug('📄 Using Google Docs content directly (no AI transcription needed)');
    
    const analysisResult = {
      transcription: docResult.cleanedHtml,
      markdown: docResult.cleanedHtml, // Can be converted later if needed
      placeholders: [], // These will be detected by the UI or later processing
      sections: docResult.structure.headings.map(h => ({
        title: h.text,
        level: h.level,
        content: h.text
      })),
      tables: docResult.structure.tables.map(t => ({
        headers: t.headers || [],
        rows: t.rows || []
      })),
      confidence: 1.0,
      metadata: {
        processingTimeMs: 0,
        elementsFound: {
          sections: docResult.structure.headings.length,
          tables: docResult.structure.tables.length,
          paragraphs: docResult.structure.paragraphs.length
        }
      }
    };

    // 9. Save template to database (compatibility with current schema)
    const supabase = getSupabase();
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({
        id: templateId,
        user_id: user.id,
        name: safeFileName || docResult.metadata.name,
        description: `Google Docs template: ${safeFileName || docResult.metadata.name}`,
        file_url: `https://docs.google.com/document/d/${documentId}`,
        storage_path: `google-docs/${documentId}`,
        file_size_bytes: docResult.html.length, // Approximate size
        original_filename: `${safeFileName || docResult.metadata.name}.gdoc`,
        mime_type: 'application/vnd.google-apps.document',
        variables: analysisResult.placeholders || [],
        ai_features: {
          source_type: 'google-docs',
          google_doc_id: documentId,
          html_content: analysisResult.transcription,
          placeholders: analysisResult.placeholders,
          sections: analysisResult.sections,
          tables: analysisResult.tables,
          google_doc_metadata: docResult.metadata,
          ai_analyzer: useGemini ? 'gemini' : 'openai',
          ...analysisResult.metadata
        },
        sample_data: {},
        category: 'general'
      })
      .select()
      .single();

    if (templateError) {
      log.error('❌ Failed to save template to database:', templateError);
      return NextResponse.json(
        { error: 'Failed to save template' },
        { status: 500 }
      );
    }

    // 10. Return response with direct Google Docs content - NO AI TRANSCRIPTION
    const response = {
      success: true,
      data: {
        templateId,
        fileName: safeFileName || docResult.metadata.name,
        sourceType: 'google-docs',
        googleDocId: documentId,
        // Direct content from Google Docs
        transcription: docResult.cleanedHtml,
        markdown: docResult.cleanedHtml,
        placeholders: analysisResult.placeholders,
        sections: analysisResult.sections,
        tables: analysisResult.tables,
        // Original document metadata
        metadata: {
          originalName: docResult.metadata.name,
          createdTime: docResult.metadata.createdTime,
          modifiedTime: docResult.metadata.modifiedTime,
          ...analysisResult.metadata
        }
      }
    };

    log.debug('✅ Google Docs analysis complete:', {
      templateId,
      placeholdersFound: analysisResult?.placeholders?.length || 0,
      sectionsFound: analysisResult?.sections?.length || 0,
      tablesFound: analysisResult?.tables?.length || 0,
      hasTranscription: !!docResult.cleanedHtml,
      contentLength: docResult.cleanedHtml?.length || 0,
    });

    // Return direct response - no compatibility layer needed
    return NextResponse.json(response);

  } catch (error) {
    // Enhanced error logging for debugging
    log.error('❌ Google Docs analysis failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      cause: error instanceof Error ? error.cause : undefined,
    });
    
    // Provide specific error messages
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    let debugInfo = {};

    if (error instanceof Error) {
      debugInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5), // First 5 lines of stack
      };

      if (error.message.includes('Google API Error') || error.message.includes('googleapis')) {
        errorMessage = 'Failed to access Google Document - check permissions';
        statusCode = 403;
      } else if (error.message.includes('authentication') || error.message.includes('token')) {
        errorMessage = 'Google authentication expired - please re-authorize';
        statusCode = 401;
      } else if (error.message.includes('Document not found') || error.message.includes('not found')) {
        errorMessage = 'Google Document not found or not accessible';
        statusCode = 404;
      } else if (error.message.includes('Cannot find module') || error.message.includes('import')) {
        errorMessage = 'Service temporarily unavailable - missing dependencies';
        statusCode = 503;
      } else {
        errorMessage = error.message || 'Google Docs analysis failed';
      }
    } else {
      // Handle non-Error objects
      errorMessage = 'Unexpected error during Google Docs analysis';
      debugInfo = { errorType: typeof error, errorValue: String(error) };
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
        type: 'google_docs_analysis_error',
        debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
      },
      { status: statusCode }
    );
  }
}

// GET endpoint to check document access (secured)
export async function GET(request: NextRequest) {
  try {
    // 1. Validate user session
    const { user, error: authError, response: authResponse } = await validateUserSession(
      request,
      { logAccess: true }
    );
    
    if (authError || !user) {
      return authResponse!;
    }

    // 2. Rate limiting check
    const { allowed, response: rateLimitResponse } = checkRateLimit(
      user.id,
      10, // 10 access checks per minute
      60000
    );
    
    if (!allowed) {
      return rateLimitResponse!;
    }

    // 3. Validate document ID from query params
    const { searchParams } = new URL(request.url);
    const documentIdParam = searchParams.get('documentId');
    
    const docIdValidation = validateGoogleDocId(documentIdParam);
    if (!docIdValidation.isValid) {
      log.warn('Invalid document ID in GET request:', { 
        errors: docIdValidation.errors,
        userId: user.id 
      });
      return NextResponse.json(
        { error: 'Invalid document ID', details: docIdValidation.errors },
        { status: 400 }
      );
    }
    
    const documentId = docIdValidation.sanitizedValue!;

    // 4. Get valid Google tokens
    const googleTokens = await getValidGoogleTokens(user.id);

    if (!googleTokens) {
      return NextResponse.json(
        { error: 'Google authentication required' },
        { status: 401 }
      );
    }

    // 5. Create service and check document access
    const docsService = await createGoogleDocsService(googleTokens);
    const structure = await docsService.getDocumentStructure(documentId);
    
    return NextResponse.json({
      success: true,
      accessible: true,
      preview: {
        headings: structure.headings.slice(0, 3),
        paragraphCount: structure.paragraphs.length,
        tableCount: structure.tables.length,
        imageCount: structure.images.length,
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        accessible: false, 
        error: error instanceof Error ? error.message : 'Access check failed' 
      },
      { status: 200 } // Still return 200 but with accessible: false
    );
  }
}
