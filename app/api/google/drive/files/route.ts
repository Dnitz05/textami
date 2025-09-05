import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/serverClient';
import { getValidGoogleTokens } from '@/lib/google/token-manager';
import { createAuthenticatedClient } from '@/lib/google/auth';
import { GoogleDriveClient } from '@/lib/google/drive-client';

// GET /api/google/drive/files - List Google Drive files
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
    const fileType = searchParams.get('type') || 'documents'; // documents | spreadsheets
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const orderBy = searchParams.get('orderBy') || 'modifiedTime desc';

    // Create authenticated Google client
    const oauth2Client = await createAuthenticatedClient(tokens, async (newTokens) => {
      // Save refreshed tokens
      const { saveGoogleTokens } = await import('@/lib/google/token-manager');
      await saveGoogleTokens(user.id, newTokens);
    });

    // Create Drive client
    const driveClient = new GoogleDriveClient(oauth2Client);

    let files;
    try {
      if (search) {
        // Search files by name
        const mimeType = fileType === 'spreadsheets' 
          ? 'application/vnd.google-apps.spreadsheet'
          : 'application/vnd.google-apps.document';
        
        files = await driveClient.searchFiles(search, mimeType);
      } else if (fileType === 'spreadsheets') {
        // Get recent spreadsheets
        files = await driveClient.getRecentSpreadsheets(limit);
      } else {
        // Get recent documents (default)
        files = await driveClient.getRecentDocuments(limit);
      }

      return NextResponse.json({
        files,
        total: files.length,
        fileType,
        search,
      });
    } catch (driveError) {
      console.error('Google Drive API error:', driveError);
      
      // Check if it's an authentication error
      const errorMessage = driveError instanceof Error ? driveError.message : String(driveError);
      
      if (errorMessage?.includes('401') || errorMessage?.includes('unauthorized')) {
        return NextResponse.json(
          { error: 'Google authentication expired. Please reconnect your account.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to access Google Drive: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in Google Drive files endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/google/drive/files - Get specific file metadata
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { fileId } = await request.json();
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
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

    // Create Drive client
    const driveClient = new GoogleDriveClient(oauth2Client);

    try {
      // Get file metadata
      const metadata = await driveClient.getFileMetadata(fileId);
      
      // Check permissions
      const permissions = await driveClient.checkFilePermissions(fileId);
      
      // Get sharing info
      const sharingInfo = await driveClient.getFileSharingInfo(fileId);
      
      return NextResponse.json({
        metadata,
        permissions,
        sharingInfo,
      });
    } catch (driveError) {
      console.error('Error getting file metadata:', driveError);
      
      const errorMessage = driveError instanceof Error ? driveError.message : String(driveError);
      
      if (errorMessage?.includes('404')) {
        return NextResponse.json(
          { error: 'File not found or access denied' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to get file metadata: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in file metadata endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}