
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScanResultProps {
  result: {
    success: boolean;
    attendee?: any;
    usageCount?: number;
    maxUses?: number;
    controlType?: string;
    message?: string;
    lastUsage?: { used_at?: string; device?: string; control_type?: string } | null;
  };
  onClose: () => void;
}

const ScanResult: React.FC<ScanResultProps> = ({ result, onClose }) => {
  const getStatusText = (status: string) => {
    switch (status) {
      case 'valid': return { text: 'Válido', color: 'text-green-500' };
      case 'used': return { text: 'Usado', color: 'text-yellow-500' };
      case 'blocked': return { text: 'Bloqueado', color: 'text-red-500' };
      default: return { text: status, color: 'text-gray-500' };
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto p-6 rounded-lg relative ${result.success ? 'bg-green-800/20 border border-green-500/30' : 'bg-red-800/20 border border-red-500/30'}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-2 right-2 h-8 w-8 hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="text-center">
        <div className={`text-4xl mb-3 ${result.success ? 'text-green-500' : 'text-red-500'}`}>
          {result.success ? '✓' : '✗'}
        </div>
        <h3 className="text-xl font-bold mb-3">
          {result.success ? 'Acceso Permitido' : 'Acceso Denegado'}
        </h3>
        {result.message && !result.success && (
          <p className="text-sm text-red-200 mb-3">{result.message}</p>
        )}
        
        {result.attendee && (
          <div className="space-y-2 text-left bg-black/20 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Nombre:</span>
                <p className="font-medium text-white">{result.attendee.name}</p>
              </div>
              {result.attendee.company && (
                <div>
                  <span className="text-gray-400">Empresa:</span>
                  <p className="font-medium text-white">{result.attendee.company}</p>
                </div>
              )}
              <div>
                <span className="text-gray-400">Categoría:</span>
                <p className="font-medium text-white">{result.attendee.ticket_category?.name || result.attendee.category || 'N/A'}</p>
              </div>
              {result.attendee.status && (
                <div>
                  <span className="text-gray-400">Estado:</span>
                  <p className={`font-medium ${getStatusText(result.attendee.status).color}`}>
                    {getStatusText(result.attendee.status).text}
                  </p>
                </div>
              )}
              <div>
                <span className="text-gray-400">Control:</span>
                <p className="font-medium text-white">{result.controlType}</p>
              </div>
              <div>
                <span className="text-gray-400">Usos:</span>
                <p className="font-medium text-white">
                  {result.usageCount} / {result.maxUses}
                </p>
              </div>
            </div>
            {!result.success && result.lastUsage && (
              <div className="mt-3 text-sm text-red-200">
                <p>
                  Este QR fue usado el {new Date(result.lastUsage.used_at || '').toLocaleString()} en «{result.lastUsage.device || 'dispositivo desconocido'}»{result.lastUsage.control_type ? ` (control: ${result.lastUsage.control_type})` : ''}.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanResult;
