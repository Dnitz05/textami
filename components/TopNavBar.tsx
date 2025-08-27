// components/TopNavBar.tsx
// Top navigation bar with logo, new template, and knowledge base
'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface TopNavBarProps {
  className?: string;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateName, setTemplateName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  // Load template name from sessionStorage on analyze page
  useEffect(() => {
    if (pathname === '/analyze') {
      const storedName = sessionStorage.getItem('templateName') || '';
      setTemplateName(storedName);
    }
  }, [pathname]);

  // Save template name to sessionStorage when changed
  const handleNameChange = (newName: string) => {
    setTemplateName(newName);
    sessionStorage.setItem('templateName', newName);
  };

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
      sessionStorage.setItem('templateName', file.name.replace('.pdf', ''));
      
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Left side */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">textami</span>
              </div>
              {pathname === '/analyze' && templateName && (
                <div className="flex flex-col">
                  {isEditingName ? (
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                      className="text-xl font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600"
                      onClick={() => setIsEditingName(true)}
                    >
                      {templateName}
                    </span>
                  )}
                </div>
              )}
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

          {/* User Avatar - Right side */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <button className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 transition-colors">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium text-gray-900">Usuari</span>
                <span className="text-xs text-gray-500">Admin</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNavBar;