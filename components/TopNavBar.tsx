// components/TopNavBar.tsx
// Top navigation bar with logo, new template, and knowledge base
'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '../hooks/useUser';
import { log } from '@/lib/logger';
import AuthForm from './AuthForm';

interface TopNavBarProps {
  className?: string;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const { user, isAuthenticated, signOut } = useUser();
  
  // Clean up duplicate templates on component mount
  React.useEffect(() => {
    try {
      const existingTemplates = Object.keys(sessionStorage)
        .filter(key => key.startsWith('instructions_'))
        .map(key => key.replace('instructions_', ''));
      
      log.debug('🧹 Existing templates found:', existingTemplates);
      
      // If there are duplicates, show warning
      const duplicates = existingTemplates.filter((item, index) => existingTemplates.indexOf(item) !== index);
      if (duplicates.length > 0) {
        log.warn('⚠️ Duplicate template names detected:', duplicates);
      }
    } catch (error) {
      log.error('Failed to clean up templates:', error);
    }
  }, []);


  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const handleNovaPlantillaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Store the selected file in sessionStorage to pass to analyze page
      const fileData = {
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      };
      sessionStorage.setItem('selectedFile', JSON.stringify(fileData));
      // Generate unique template name
      const baseName = file.name.replace(/\.(pdf|docx)$/i, '');
      let uniqueName = baseName;
      let counter = 1;
      
      // Check for existing templates and add number if needed
      const existingTemplates = Object.keys(sessionStorage)
        .filter(key => key.startsWith('instructions_'))
        .map(key => key.replace('instructions_', ''));
      
      log.debug('🔍 Generating unique name for:', { baseName, existingTemplates });
      
      while (existingTemplates.includes(uniqueName)) {
        uniqueName = `${baseName} (${counter})`;
        counter++;
        log.debug('📝 Name exists, trying:', uniqueName);
      }
      
      sessionStorage.setItem('templateName', uniqueName);
      log.debug('✅ Generated unique template name:', uniqueName);
      
      // Create FileReader to store file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64String = btoa(String.fromCharCode(...uint8Array));
        
        sessionStorage.setItem('selectedFileContent', base64String);
        
        // Navigate to analyze page
        router.push('/analyze');
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Left side */}
          <div className="flex items-center flex-shrink-0">
            <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center hover:opacity-80 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="36" viewBox="0 0 320 120">
                <g>
                  <rect x="10"  y="18"  width="18" height="18" rx="2" fill="black"/>
                  <rect x="36"  y="18"  width="18" height="18" rx="2" fill="black"/>
                  <rect x="62"  y="18"  width="18" height="18" rx="2" fill="#60A5FA"/>

                  <rect x="10"  y="44"  width="18" height="18" rx="2" fill="black"/>
                  <rect x="36"  y="44"  width="18" height="18" rx="2" fill="#60A5FA"/>
                  <rect x="62"  y="44"  width="18" height="18" rx="2" fill="black"/>

                  <rect x="10"  y="70"  width="18" height="18" rx="2" fill="#60A5FA"/>
                  <rect x="36"  y="70"  width="18" height="18" rx="2" fill="black"/>
                  <rect x="62"  y="70"  width="18" height="18" rx="2" fill="black"/>
                </g>

                <g stroke="#60A5FA" stroke-width="3" fill="none">
                  <line x1="71" y1="27" x2="45" y2="53"/>
                  <line x1="19" y1="79" x2="45" y2="53"/>
                </g>

                <text x="100" y="68" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="52" font-weight="700" fill="#2D3748">
                  docmile
                </text>
              </svg>
            </Link>
          </div>

          {/* Navigation Links - Center */}
          <div className="hidden md:flex items-center space-x-6 flex-1 justify-center">
            <button
              onClick={handleNovaPlantillaClick}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/analyze')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Nova Plantilla</span>
            </button>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Link
              href="/templates"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/templates')
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Plantilles</span>
            </Link>

            <Link
              href="/knowledge"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/knowledge')
                  ? 'bg-amber-100 text-amber-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Knowledge</span>
            </Link>
          </div>

          {/* Auth Section - Right side */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-900">
                      {user?.email?.split('@')[0] || 'Usuari'}
                    </span>
                    <span className="text-xs text-green-600">Autenticat</span>
                  </div>
                </button>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                >
                  Sortir
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-xs text-gray-500">No autenticat</span>
                </div>
                <button
                  onClick={() => setShowAuthForm(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-300"
                >
                  Entrar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Auth Form Modal */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Autenticació</h2>
              <button
                onClick={() => setShowAuthForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <AuthForm />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default TopNavBar;