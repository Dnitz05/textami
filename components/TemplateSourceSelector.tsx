'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface TemplateSourceOption {
  type: 'docx' | 'google-docs';
  title: string;
  description: string;
  icon: string;
  features: string[];
  disabled?: boolean;
  comingSoon?: boolean;
}

interface TemplateSourceSelectorProps {
  onSourceSelected: (sourceType: 'docx' | 'google-docs') => void;
  onClose: () => void;
  className?: string;
}

export default function TemplateSourceSelector({
  onSourceSelected,
  onClose,
  className = ''
}: TemplateSourceSelectorProps) {
  const [selectedSource, setSelectedSource] = useState<'docx' | 'google-docs' | null>(null);

  const sourceOptions: TemplateSourceOption[] = [
    {
      type: 'docx',
      title: 'Document Word (.docx)',
      description: 'Puja un fitxer Word des del teu ordinador',
      icon: '📄',
      features: [
        'Preservació d\'estils perfecta',
        'Taules complexes',
        'Format avançat',
        'Compatible amb totes les versions'
      ]
    },
    {
      type: 'google-docs',
      title: 'Google Docs',
      description: 'Importa des de Google Drive',
      icon: '📝',
      features: [
        'Accés directe desde Drive',
        'Col·laboració en temps real',
        'Sempre actualitzat',
        'Generació ràpida'
      ],
      comingSoon: false // Google Docs is now ready!
    }
  ];

  const handleSourceSelect = (sourceType: 'docx' | 'google-docs') => {
    setSelectedSource(sourceType);
  };

  const handleConfirm = () => {
    if (selectedSource) {
      onSourceSelected(selectedSource);
      onClose();
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Escull el tipus de plantilla
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Selecciona d'on vols importar la teva plantilla de document
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Options */}
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {sourceOptions.map((option) => (
              <Card
                key={option.type}
                className={`relative cursor-pointer transition-all duration-200 ${
                  selectedSource === option.type
                    ? 'ring-2 ring-blue-500 border-blue-500'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                } ${
                  option.comingSoon || option.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                onClick={() => handleSourceSelect(option.type)}
              >
                {/* Coming Soon Badge */}
                {option.comingSoon && (
                  <div className="absolute top-2 right-2 bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
                    Coming Soon
                  </div>
                )}

                <div className="p-6">
                  {/* Icon and Title */}
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="text-2xl">{option.icon}</div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {option.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {option.description}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    {option.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Selection Indicator */}
                  {selectedSource === option.type && (
                    <div className="mt-4 flex items-center space-x-2 text-blue-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Seleccionat</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Google Docs Info */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="text-green-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-green-900 mb-1">
                  Google Docs Integration - Disponible ara!
                </h4>
                <p className="text-xs text-green-800">
                  Ja pots connectar amb Google Drive per importar els teus documents. 
                  L'anàlisi IA és més precisa amb Google Docs i ofereix funcions avançades.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancel·lar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedSource}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}