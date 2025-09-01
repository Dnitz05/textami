// Google Integration Types
export interface GoogleAuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

export interface GoogleDocMetadata {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  owners: Array<{
    displayName: string;
    emailAddress: string;
  }>;
  permissions: Array<{
    role: string;
    type: string;
  }>;
}

export interface GoogleSheetMetadata {
  spreadsheetId: string;
  properties: {
    title: string;
    locale: string;
    timeZone: string;
  };
  sheets: Array<{
    properties: {
      sheetId: number;
      title: string;
      index: number;
      gridProperties: {
        rowCount: number;
        columnCount: number;
      };
    };
  }>;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
  thumbnailLink?: string;
  webViewLink: string;
}

export interface GoogleApiError {
  code: number;
  message: string;
  errors?: Array<{
    domain: string;
    reason: string;
    message: string;
  }>;
}

// Google API Scopes
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly', // Read Google Drive files
  'https://www.googleapis.com/auth/documents.readonly', // Read Google Docs
  'https://www.googleapis.com/auth/spreadsheets.readonly', // Read Google Sheets
  'https://www.googleapis.com/auth/drive.file', // Create files in Drive
  'https://www.googleapis.com/auth/userinfo.profile', // User profile info
  'https://www.googleapis.com/auth/userinfo.email', // User email
] as const;

export type GoogleScope = typeof GOOGLE_SCOPES[number];

// Google API Rate Limiting
export interface RateLimitConfig {
  requests_per_100_seconds: number;
  requests_per_100_seconds_per_user: number;
  requests_per_day: number;
}

export const GOOGLE_API_LIMITS: Record<string, RateLimitConfig> = {
  drive: {
    requests_per_100_seconds: 1000,
    requests_per_100_seconds_per_user: 100,
    requests_per_day: 10000000
  },
  docs: {
    requests_per_100_seconds: 300,
    requests_per_100_seconds_per_user: 300,
    requests_per_day: 1000000
  },
  sheets: {
    requests_per_100_seconds: 300,
    requests_per_100_seconds_per_user: 300,
    requests_per_day: 1000000
  }
};