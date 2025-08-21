// components/ui/alert.tsx
// TEXTAMI CORE - Minimal Alert Component

"use client"

import React from 'react'

interface AlertProps {
  children: React.ReactNode
  variant?: 'info' | 'success' | 'warning' | 'error'
  className?: string
  onClose?: () => void
}

export function Alert({ 
  children, 
  variant = 'info', 
  className = '',
  onClose
}: AlertProps) {
  const variantStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800', 
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  }
  
  const iconMap = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    error: '✕'
  }
  
  return (
    <div className={`border rounded-md p-4 ${variantStyles[variant]} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 font-bold">
          {iconMap[variant]}
        </div>
        <div className="flex-grow">
          {children}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-3 text-current opacity-70 hover:opacity-100 focus:outline-none"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}