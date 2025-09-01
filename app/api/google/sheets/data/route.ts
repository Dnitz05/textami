import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/serverClient';
import { getValidGoogleTokens } from '@/lib/google/token-manager';
import { createAuthenticatedClient } from '@/lib/google/auth';
import { GoogleSheetsService } from '@/lib/google/sheets-service';

// GET /api/google/sheets/data - Get spreadsheet data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get valid Google tokens
    const tokens = await getValidGoogleTokens(user.id);
    if (!tokens) {
      return NextResponse.json(
        { error: 'Google account not connected or tokens expired' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get('spreadsheetId');
    const sheetName = searchParams.get('sheetName') || undefined;
    const range = searchParams.get('range') || 'A:Z';
    const preview = searchParams.get('preview') === 'true';
    const validate = searchParams.get('validate') === 'true';

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'spreadsheetId parameter is required' },
        { status: 400 }
      );
    }

    // Create authenticated Google client
    const oauth2Client = await createAuthenticatedClient(tokens, async (newTokens) => {
      const { saveGoogleTokens } = await import('@/lib/google/token-manager');
      await saveGoogleTokens(user.id, newTokens);
    });

    // Create Sheets service
    const sheetsService = new GoogleSheetsService(oauth2Client);

    try {
      let responseData: any = {};

      // Get spreadsheet info
      const spreadsheetInfo = await sheetsService.getSpreadsheetInfo(spreadsheetId);
      responseData.spreadsheetInfo = spreadsheetInfo;

      // Get data (preview or full)
      if (preview) {
        const previewData = await sheetsService.getDataPreview(spreadsheetId, sheetName, 10);
        responseData.preview = previewData;
      } else {
        const sheetData = await sheetsService.getSheetData(spreadsheetId, range, sheetName);
        responseData.data = sheetData;
      }

      // Validate data if requested
      if (validate) {
        const validation = await sheetsService.validateSheetData(spreadsheetId, range);
        responseData.validation = validation;
      }

      return NextResponse.json(responseData);
    } catch (sheetsError) {
      console.error('Google Sheets API error:', sheetsError);
      
      if (sheetsError.message?.includes('404')) {
        return NextResponse.json(
          { error: 'Spreadsheet not found or access denied' },
          { status: 404 }
        );
      }
      
      if (sheetsError.message?.includes('403')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to access this spreadsheet' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to access Google Sheets: ${sheetsError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in Google Sheets data endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/google/sheets/data - AI-powered spreadsheet analysis
export async function POST(request: NextRequest) {
  try {
    // Security middleware checks
    const { validateUserSession, checkRateLimit } = await import('@/lib/security/auth-middleware');
    
    // Validate user session
    const authResult = await validateUserSession(request);
    if (authResult.error || !authResult.user) {
      return authResult.response || NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = checkRateLimit(clientIp, 'google-sheets');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response || NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { 
      spreadsheetId, 
      sheetName,
      range 
    } = body;

    // Validate required parameters
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Invalid request data', details: 'spreadsheetId is required' },
        { status: 400 }
      );
    }

    // Validate spreadsheet ID format (Google Sheets ID pattern)
    if (!/^[a-zA-Z0-9-_]{44}$/.test(spreadsheetId)) {
      return NextResponse.json(
        { error: 'Invalid request data', details: 'Invalid spreadsheetId format' },
        { status: 400 }
      );
    }

    // Validate range format if provided
    if (range && !/^[A-Z]+\d*:[A-Z]+\d*$/.test(range.replace(/^[^!]*!/, ''))) {
      return NextResponse.json(
        { error: 'Invalid request data', details: 'Invalid range format' },
        { status: 400 }
      );
    }

    // Get valid Google tokens
    const tokens = await getValidGoogleTokens(user.id);
    if (!tokens) {
      return NextResponse.json(
        { error: 'Google account not connected or tokens expired' },
        { status: 401 }
      );
    }

    // Create authenticated Google client
    const oauth2Client = await createAuthenticatedClient(tokens, async (newTokens) => {
      const { saveGoogleTokens } = await import('@/lib/google/token-manager');
      await saveGoogleTokens(user.id, newTokens);
    });

    // Create Sheets service
    const sheetsService = new GoogleSheetsService(oauth2Client);

    try {
      let responseData: any = {};

      switch (action) {
        case 'search':
          if (!searchTerm) {
            return NextResponse.json(
              { error: 'searchTerm is required for search action' },
              { status: 400 }
            );
          }
          
          const searchResults = await sheetsService.searchValues(
            spreadsheetId, 
            searchTerm, 
            sheetName
          );
          responseData.searchResults = searchResults;
          break;

        case 'analyze':
          // Get full data for analysis
          const sheetData = await sheetsService.getSheetData(spreadsheetId, range, sheetName);
          const validation = await sheetsService.validateSheetData(spreadsheetId, range);
          
          // Basic analysis
          const analysis = {
            totalRows: sheetData.data.length,
            totalColumns: sheetData.headers.length,
            headers: sheetData.headers,
            dataTypes: analyzeDataTypes(sheetData.data, sheetData.headers),
            sampleData: sheetData.data.slice(0, 3), // First 3 rows as sample
            validation,
          };
          
          responseData.analysis = analysis;
          responseData.sheetData = sheetData;
          break;

        case 'preview':
          const previewData = await sheetsService.getDataPreview(spreadsheetId, sheetName, 5);
          responseData.preview = previewData;
          break;

        default:
          return NextResponse.json(
            { error: `Unknown action: ${action}` },
            { status: 400 }
          );
      }

      return NextResponse.json(responseData);
    } catch (sheetsError) {
      console.error('Google Sheets operation error:', sheetsError);
      return NextResponse.json(
        { error: `Operation failed: ${sheetsError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in Google Sheets POST endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to analyze data types in columns
function analyzeDataTypes(data: Record<string, any>[], headers: string[]) {
  const dataTypes: Record<string, {
    type: string;
    examples: any[];
    nullCount: number;
    uniqueCount: number;
  }> = {};

  headers.forEach(header => {
    const columnValues = data
      .map(row => row[header])
      .filter(value => value !== null && value !== undefined && value !== '');

    const types = new Set(columnValues.map(value => typeof value));
    const uniqueValues = new Set(columnValues);
    
    // Determine primary type
    let primaryType = 'string';
    if (types.size === 1) {
      primaryType = Array.from(types)[0];
    } else if (types.has('number') && types.has('string')) {
      // Mixed numbers and strings - check if strings are mostly numeric-like
      const numericStrings = columnValues.filter(value => 
        typeof value === 'string' && !isNaN(Number(value))
      ).length;
      
      if (numericStrings > columnValues.length * 0.5) {
        primaryType = 'mixed-numeric';
      } else {
        primaryType = 'mixed';
      }
    } else {
      primaryType = 'mixed';
    }

    dataTypes[header] = {
      type: primaryType,
      examples: Array.from(uniqueValues).slice(0, 3), // First 3 unique values
      nullCount: data.length - columnValues.length,
      uniqueCount: uniqueValues.size,
    };
  });

  return dataTypes;
}