
import React from 'react';

interface ScanResultProps {
  result: {
    success: boolean;
    attendee?: any;
    usageCount?: number;
    controlType?: string;
  };
}

const ScanResult: React.FC<ScanResultProps> = ({ result }) => {
  return (
    <div className={`flex items-center justify-center h-80 p-4 rounded-md ${result.success ? 'bg-green-800/20' : 'bg-red-800/20'}`}>
      <div className="text-center">
        <div className={`text-5xl mb-2 ${result.success ? 'text-green-500' : 'text-red-500'}`}>
          {result.success ? '✓' : '✗'}
        </div>
        <p className="text-lg font-medium">
          {result.success ? 'Control Registrado' : 'Control Denegado'}
        </p>
        {result.attendee && (
          <>
            <p className="text-sm mt-1">
              {result.attendee.name} - {result.attendee.company}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {result.controlType} - Uso #{result.usageCount}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ScanResult;
