# 🔗 API ENDPOINTS DOCUMENTATION - TEXTAMI
*Generated: 2024-09-01 | Status: Phase 4*

## 📋 **OVERVIEW**
Textami API provides AI-first document generation capabilities with Google integration.

---

## 🔐 **AUTHENTICATION**
All endpoints require valid Supabase authentication unless marked as public.

### Headers Required:
```http
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

---

## 📄 **GOOGLE DOCS ENDPOINTS**

### `POST /api/google/docs/analyze`
**AI-powered Google Docs analysis and placeholder detection**

#### Request:
```json
{
  "documentId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "options": {
    "extractPlaceholders": true,
    "analyzeStructure": true,
    "convertToHTML": true
  }
}
```

#### Response (200):
```json
{
  "success": true,
  "documentId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "title": "Contract Template",
  "placeholders": [
    {
      "text": "CLIENT_NAME",
      "type": "string",
      "confidence": 95,
      "location": { "paragraph": 1, "position": 25 }
    }
  ],
  "structure": {
    "headings": [...],
    "tables": [...],
    "images": [...]
  },
  "html": "<div class='google-doc'>...</div>"
}
```

#### Error Responses:
- `401`: Authentication required or expired Google tokens
- `403`: Insufficient permissions to access document  
- `404`: Document not found
- `500`: AI analysis failed or Google API error

---

### `POST /api/google/docs/mapping`
**AI-powered mapping between document placeholders and Excel data**

#### Request:
```json
{
  "documentId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "excelData": {
    "headers": ["Client Name", "Email", "Amount"],
    "rows": [["John Doe", "john@example.com", "$5000"]]
  },
  "options": {
    "confidenceThreshold": 80,
    "suggestMappings": true
  }
}
```

#### Response (200):
```json
{
  "success": true,
  "mappings": [
    {
      "placeholder": "CLIENT_NAME", 
      "excelColumn": "Client Name",
      "confidence": 95,
      "reasoning": "Exact semantic match"
    }
  ],
  "unmappedPlaceholders": ["SERVICE_DATE"],
  "unmappedColumns": ["Internal ID"]
}
```

---

### `POST /api/google/docs/generate`
**Generate final documents with data applied**

#### Request:
```json
{
  "documentId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "mappings": [
    { "placeholder": "CLIENT_NAME", "value": "John Doe" }
  ],
  "outputFormat": "docx",
  "options": {
    "preserveFormatting": true,
    "generateMultiple": false
  }
}
```

#### Response (200):
```json
{
  "success": true,
  "documentUrl": "https://storage.supabase.co/object/public/documents/generated_doc.docx",
  "metadata": {
    "originalTitle": "Contract Template",
    "generatedTitle": "Contract - John Doe",
    "placeholdersReplaced": 15,
    "generationTime": "2024-09-01T10:30:00Z"
  }
}
```

---

## 📊 **GOOGLE SHEETS ENDPOINTS**

### `GET /api/google/drive/files`
**List Google Drive files (Docs and Sheets)**

#### Query Parameters:
- `type`: "docs" | "sheets" | "both" (default: "both")
- `limit`: number (default: 50, max: 100)
- `pageToken`: string (for pagination)
- `searchQuery`: string (optional)

#### Response (200):
```json
{
  "files": [
    {
      "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "name": "Client Database",
      "mimeType": "application/vnd.google-apps.spreadsheet",
      "modifiedTime": "2024-09-01T09:00:00Z",
      "webViewLink": "https://docs.google.com/spreadsheets/d/...",
      "owners": [{"displayName": "John Doe", "emailAddress": "john@example.com"}]
    }
  ],
  "nextPageToken": "CAESEAhX...",
  "totalFiles": 150
}
```

---

### `POST /api/google/sheets/data`
**AI-powered spreadsheet analysis and column detection**

#### Request:
```json
{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "sheetName": "Clients",
  "range": "A1:E100"
}
```

#### Response (200):
```json
{
  "success": true,
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "sheetName": "Clients",
  "totalRows": 95,
  "totalColumns": 5,
  "columns": [
    {
      "column": "A",
      "header": "Client Name", 
      "dataType": "string",
      "confidence": 95,
      "aiDescription": "Full name of the client",
      "sampleData": ["John Doe", "Jane Smith", "Bob Wilson"]
    }
  ],
  "analysis": {
    "dataQuality": "high",
    "missingValues": 5,
    "duplicateRows": 0
  }
}
```

---

## 🔒 **AUTHENTICATION ENDPOINTS**

### `POST /api/auth/google`
**Initiate Google OAuth flow**

#### Request:
```json
{
  "scopes": ["drive.readonly", "documents.readonly", "spreadsheets.readonly"],
  "redirectUri": "http://localhost:3000/auth/callback"
}
```

#### Response (200):
```json
{
  "authUrl": "https://accounts.google.com/oauth/authorize?client_id=...",
  "state": "random-csrf-token"
}
```

---

### `POST /api/auth/google/callback`
**Handle Google OAuth callback**

#### Request:
```json
{
  "code": "4/0AX4XfWi...",
  "state": "random-csrf-token"
}
```

#### Response (200):
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/..."
  },
  "tokens": {
    "access_token": "ya29.a0ARrd...",
    "refresh_token": "1//04...",
    "expires_at": 1693574400
  }
}
```

---

## 🚫 **ERROR HANDLING**

### Standard Error Format:
```json
{
  "error": "Human readable error message",
  "code": "SPECIFIC_ERROR_CODE", 
  "details": "Additional technical details",
  "timestamp": "2024-09-01T10:30:00Z",
  "requestId": "req_123456"
}
```

### Common Error Codes:
- `INVALID_DOCUMENT_ID`: Google document ID format invalid
- `DOCUMENT_ACCESS_DENIED`: Insufficient permissions 
- `GOOGLE_TOKEN_EXPIRED`: Need to re-authenticate with Google
- `AI_ANALYSIS_FAILED`: OpenAI/Gemini processing error
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_SPREADSHEET_FORMAT`: Excel/Sheets data format issues

---

## 📊 **RATE LIMITS**

| Endpoint Type | Limit | Window |
|--------------|-------|---------|
| Google API calls | 100 requests | 1 hour |
| AI analysis | 20 requests | 1 hour |
| Document generation | 50 documents | 1 hour |
| Authentication | 10 attempts | 5 minutes |

---

## 🔍 **MONITORING & DEBUGGING**

### Request Headers for Debugging:
```http
X-Debug-Mode: true
X-Request-ID: custom-request-id
X-User-Agent: textami-client/1.0
```

### Health Check:
```bash
GET /api/health
# Returns: {"status": "healthy", "timestamp": "...", "version": "1.0.0"}
```