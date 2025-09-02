'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
  expiresAt?: string;
  needsReauth?: boolean;
}

interface GoogleAuthButtonProps {
  onConnectionChange?: (connected: boolean) => void;
}

export default function GoogleAuthButton({ onConnectionChange }: GoogleAuthButtonProps = {}) {
  const [status, setStatus] = useState<GoogleConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check connection status on mount
  useEffect(() => {
    checkGoogleConnectionStatus();
    
    // Check for auth callback result
    const urlParams = new URLSearchParams(window.location.search);
    const googleAuth = urlParams.get('google_auth');
    
    if (googleAuth === 'success') {
      toast.success('Google account connected successfully!');
      checkGoogleConnectionStatus();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (googleAuth === 'error') {
      const message = urlParams.get('message') || 'Authentication failed';
      toast.error(`Google authentication failed: ${message}`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkGoogleConnectionStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await fetch('/api/auth/google', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        onConnectionChange?.(data.status.connected);
      } else if (response.status === 401) {
        // User not authenticated - this is expected for new users
        setStatus({ connected: false });
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error checking Google connection status:', error);
      setStatus({ connected: false });
      onConnectionChange?.(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated first
      const authResponse = await fetch('/api/auth/google', {
        method: 'POST',
      });

      if (authResponse.ok) {
        // User is authenticated, use secure endpoint
        window.location.href = '/api/auth/google';
      } else {
        // User not authenticated, use public signin endpoint
        window.location.href = '/api/auth/google/signin';
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error('Failed to connect to Google');
      setLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect your Google account? This will remove access to your Google Docs and Sheets.')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/google', {
        method: 'DELETE',
      });

      if (response.ok) {
        setStatus({ connected: false });
        toast.success('Google account disconnected');
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast.error('Failed to disconnect Google account');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Checking Google connection...</span>
      </div>
    );
  }

  if (status.connected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-900">
              Google Account Connected
            </p>
            {status.email && (
              <p className="text-sm text-green-700">{status.email}</p>
            )}
            {status.needsReauth && (
              <p className="text-xs text-amber-600">⚠️ Needs re-authentication</p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          {status.needsReauth && (
            <Button
              onClick={handleConnectGoogle}
              disabled={loading}
              size="sm"
              variant="outline"
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              {loading ? 'Reconnecting...' : 'Reconnect Google'}
            </Button>
          )}
          <Button
            onClick={handleDisconnectGoogle}
            disabled={loading}
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnectGoogle}
      disabled={loading}
      className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )}
      <span>{loading ? 'Connecting...' : 'Connect Google Account'}</span>
    </Button>
  );
}