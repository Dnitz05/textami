'use client';

import { useState } from 'react';

export default function GoogleAuthDebugPage() {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/google-auth');
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      setDebugData({ error: 'Failed to run diagnostic', details: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const resetTokens = async () => {
    setResetLoading(true);
    try {
      const response = await fetch('/api/auth/google/reset', { method: 'POST' });
      const data = await response.json();
      alert(data.message || 'Reset completed');
      // Re-run diagnostic
      await runDiagnostic();
    } catch (error) {
      alert('Reset failed: ' + String(error));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Google Auth Debug Tool</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runDiagnostic} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '10px', backgroundColor: '#007acc', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Running...' : '🔍 Run Diagnostic'}
        </button>
        
        <button 
          onClick={resetTokens} 
          disabled={resetLoading}
          style={{ padding: '10px', backgroundColor: '#cc0000', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {resetLoading ? 'Resetting...' : '🗑️ Clear Tokens'}
        </button>
      </div>

      {debugData && (
        <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
          <h2>Diagnostic Results</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '5px' }}>
        <h3>🛠️ Troubleshooting Steps</h3>
        <ol>
          <li><strong>Run Diagnostic</strong> - Check all system components</li>
          <li><strong>Check Database</strong> - Look for profile and token data</li>
          <li><strong>Verify Environment</strong> - Ensure Google credentials are set</li>
          <li><strong>Clear Tokens</strong> - Reset authentication state if needed</li>
          <li><strong>Re-authenticate</strong> - Try connecting Google account again</li>
        </ol>
        
        <h4>Common Issues:</h4>
        <ul>
          <li><code>Supabase not configured</code> - Database URL not set</li>
          <li><code>needsReauth: true</code> - Tokens expired, clear and reconnect</li>
          <li><code>hasProfile: false</code> - User profile missing in database</li>
          <li><code>google_connected: false</code> - Connection not established</li>
        </ul>
      </div>
    </div>
  );
}