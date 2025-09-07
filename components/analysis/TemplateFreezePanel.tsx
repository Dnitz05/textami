// components/analysis/TemplateFreezePanel.tsx
// Panel 4: Template freeze controls and status
import React from 'react';

interface TemplateFreezePanelProps {
  pipelineStatus: string;
  onFreeze?: () => void;
  mappingsCount?: number;
  totalTags?: number;
}

const TemplateFreezePanel: React.FC<TemplateFreezePanelProps> = ({
  pipelineStatus,
  onFreeze,
  mappingsCount = 0,
  totalTags = 0
}) => {
  const isReadyToFreeze = pipelineStatus === 'mapped' && mappingsCount > 0;
  const isFrozen = pipelineStatus === 'frozen';

  const getStatusInfo = () => {
    switch (pipelineStatus) {
      case 'analyzed':
        return {
          icon: '📊',
          title: 'Analysis Complete',
          message: 'Document analyzed. Upload Excel data to continue.',
          color: 'blue'
        };
      case 'mapped':
        if (mappingsCount === 0) {
          return {
            icon: '⚠️',
            title: 'Mapping Required',
            message: 'Map at least one tag to Excel column before freezing.',
            color: 'yellow'
          };
        }
        return {
          icon: '✅',
          title: 'Ready to Freeze',
          message: `${mappingsCount} tags mapped. Template ready for freezing.`,
          color: 'green'
        };
      case 'frozen':
        return {
          icon: '🧊',
          title: 'Template Frozen',
          message: 'Template contains placeholders. Ready for mass production.',
          color: 'purple'
        };
      default:
        return {
          icon: '⏳',
          title: 'Waiting...',
          message: 'Complete previous steps to enable freezing.',
          color: 'gray'
        };
    }
  };

  const statusInfo = getStatusInfo();

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  const getButtonClasses = () => {
    if (isFrozen) {
      return 'bg-purple-600 hover:bg-purple-700 text-white cursor-default';
    }
    if (isReadyToFreeze) {
      return 'bg-orange-600 hover:bg-orange-700 text-white';
    }
    return 'bg-gray-300 text-gray-500 cursor-not-allowed';
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-4 border-b bg-gray-50 h-20">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          Template Freeze
        </h3>
        <p className="text-sm text-gray-600 mt-1">Prepare template for mass production</p>
      </div>

      <div className="p-4">
        {/* Status Card */}
        <div className={`rounded-lg border p-4 mb-6 ${getColorClasses(statusInfo.color)}`}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">{statusInfo.icon}</span>
            <div>
              <div className="font-semibold text-sm">{statusInfo.title}</div>
              <div className="text-sm mt-1">{statusInfo.message}</div>
            </div>
          </div>
        </div>

        {/* Progress Info */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Tags Mapped:</span>
            <span className="font-medium">
              {mappingsCount}/{totalTags}
              {totalTags > 0 && (
                <span className="text-gray-500 ml-1">
                  ({Math.round((mappingsCount / totalTags) * 100)}%)
                </span>
              )}
            </span>
          </div>
          
          {totalTags > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(mappingsCount / totalTags) * 100}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Freeze Process Explanation */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 text-sm mb-2">What happens when you freeze?</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">1.</span>
              Original DOCX template is analyzed
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">2.</span>
              Detected values are replaced with {`{{placeholders}}`}
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">3.</span>
              Frozen template is saved for mass production
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">4.</span>
              Format and styling are 100% preserved
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isFrozen ? (
            <div>
              <button
                onClick={isReadyToFreeze ? onFreeze : undefined}
                disabled={!isReadyToFreeze}
                className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-colors ${getButtonClasses()}`}
              >
                {isReadyToFreeze ? 'Freeze Template' : mappingsCount === 0 ? 'Complete mapping first' : pipelineStatus !== 'mapped' ? 'Waiting for mapping...' : 'Freeze Template'}
              </button>

              <div className="text-xs text-gray-500 text-center">
                Freezing will modify the original DOCX file by inserting {`{{placeholders}}`} based on your mappings.
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Template Successfully Frozen
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Template is ready for mass document generation
              </div>
            </div>
          )}
        </div>

        {/* Warning for Important Action */}
        {isReadyToFreeze && !isFrozen && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-sm text-amber-800">
                <div className="font-medium">Important:</div>
                <div className="mt-1">This action will permanently modify your DOCX template. Make sure your mappings are correct before proceeding.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateFreezePanel;