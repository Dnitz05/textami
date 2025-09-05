import { drive_v3, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GoogleDriveFile, GoogleDocMetadata, GoogleApiError } from './types';
import { handleGoogleApiError } from './auth';

// Google Drive client wrapper
export class GoogleDriveClient {
  private drive: drive_v3.Drive;
  
  constructor(private oauth2Client: OAuth2Client) {
    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
  }

  // List files in Drive (with filtering)
  async listFiles(options: {
    mimeType?: string;
    pageSize?: number;
    orderBy?: string;
    q?: string; // Advanced query
  } = {}): Promise<GoogleDriveFile[]> {
    try {
      const {
        mimeType = 'application/vnd.google-apps.document', // Default to Google Docs
        pageSize = 100,
        orderBy = 'modifiedTime desc',
        q
      } = options;

      let query = `mimeType='${mimeType}' and trashed=false`;
      if (q) {
        query += ` and ${q}`;
      }

      const response = await this.drive.files.list({
        pageSize,
        orderBy,
        q: query,
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,parents,thumbnailLink,webViewLink)',
      });

      const files = response.data.files || [];
      
      return files.map(file => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size || undefined,
        createdTime: file.createdTime!,
        modifiedTime: file.modifiedTime!,
        parents: file.parents || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        webViewLink: file.webViewLink!,
      }));
    } catch (error) {
      console.error('Error listing Drive files:', error);
      throw handleGoogleApiError(error);
    }
  }

  // Get specific file metadata
  async getFileMetadata(fileId: string): Promise<GoogleDocMetadata> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id,name,mimeType,createdTime,modifiedTime,size,owners,permissions',
      });

      const file = response.data;
      
      return {
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        createdTime: file.createdTime!,
        modifiedTime: file.modifiedTime!,
        size: file.size || undefined,
        owners: file.owners?.map(owner => ({
          displayName: owner.displayName || '',
          emailAddress: owner.emailAddress || '',
        })) || [],
        permissions: file.permissions?.map(permission => ({
          role: permission.role || '',
          type: permission.type || '',
        })) || [],
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw handleGoogleApiError(error);
    }
  }

  // Check if user has access to file
  async checkFilePermissions(fileId: string): Promise<{
    canRead: boolean;
    canWrite: boolean;
    canComment: boolean;
  }> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'capabilities',
      });

      const capabilities = response.data.capabilities || {};
      
      return {
        canRead: capabilities.canDownload !== false, // Default true if not specified
        canWrite: capabilities.canEdit === true,
        canComment: capabilities.canComment === true,
      };
    } catch (error) {
      console.error('Error checking file permissions:', error);
      // If we can't check permissions, assume read-only access
      return {
        canRead: true,
        canWrite: false,
        canComment: false,
      };
    }
  }

  // Create folder in Drive
  async createFolder(name: string, parentFolderId?: string): Promise<string> {
    try {
      const folderMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined,
      };

      const response = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      return response.data.id!;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw handleGoogleApiError(error);
    }
  }

  // Get or create output folder for Textami
  async getOrCreateTextamiFolder(): Promise<string> {
    try {
      // First, try to find existing Textami folder
      const existingFolders = await this.listFiles({
        mimeType: 'application/vnd.google-apps.folder',
        q: "name='Textami Generated Documents'",
        pageSize: 1,
      });

      if (existingFolders.length > 0) {
        return existingFolders[0].id;
      }

      // Create new folder if doesn't exist
      return await this.createFolder('Textami Generated Documents');
    } catch (error) {
      console.error('Error getting/creating Textami folder:', error);
      throw handleGoogleApiError(error);
    }
  }

  // Copy file (useful for templates)
  async copyFile(fileId: string, name: string, parentFolderId?: string): Promise<string> {
    try {
      const copyMetadata = {
        name,
        parents: parentFolderId ? [parentFolderId] : undefined,
      };

      const response = await this.drive.files.copy({
        fileId,
        requestBody: copyMetadata,
        fields: 'id',
      });

      return response.data.id!;
    } catch (error) {
      console.error('Error copying file:', error);
      throw handleGoogleApiError(error);
    }
  }

  // Search files by name or content
  async searchFiles(query: string, mimeType?: string): Promise<GoogleDriveFile[]> {
    const searchQuery = mimeType 
      ? `name contains '${query}' and mimeType='${mimeType}' and trashed=false`
      : `name contains '${query}' and trashed=false`;

    return this.listFiles({
      q: searchQuery,
      pageSize: 20,
    });
  }

  // Get recent Google Docs
  async getRecentDocuments(limit: number = 50): Promise<GoogleDriveFile[]> {
    return this.listFiles({
      mimeType: 'application/vnd.google-apps.document',
      pageSize: limit,
      orderBy: 'modifiedTime desc',
    });
  }

  // Get recent Google Sheets
  async getRecentSpreadsheets(limit: number = 50): Promise<GoogleDriveFile[]> {
    return this.listFiles({
      mimeType: 'application/vnd.google-apps.spreadsheet',
      pageSize: limit,
      orderBy: 'modifiedTime desc',
    });
  }

  // Check if file exists and is accessible
  async isFileAccessible(fileId: string): Promise<boolean> {
    try {
      await this.drive.files.get({
        fileId,
        fields: 'id',
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get file sharing info
  async getFileSharingInfo(fileId: string): Promise<{
    isPublic: boolean;
    sharedWithDomain: boolean;
    hasRestrictedAccess: boolean;
  }> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'permissions',
      });

      const permissions = response.data.permissions || [];
      
      const isPublic = permissions.some(p => 
        p.type === 'anyone' && (p.role === 'reader' || p.role === 'writer')
      );
      
      const sharedWithDomain = permissions.some(p => 
        p.type === 'domain'
      );
      
      const hasRestrictedAccess = permissions.length <= 1; // Only owner

      return {
        isPublic,
        sharedWithDomain,
        hasRestrictedAccess,
      };
    } catch (error) {
      console.error('Error getting file sharing info:', error);
      return {
        isPublic: false,
        sharedWithDomain: false,
        hasRestrictedAccess: true,
      };
    }
  }
}