
import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface CameraPermissionsProps {
  hasCamera: boolean;
  permissionStatus: 'unknown' | 'granted' | 'denied' | 'prompt';
  cameraError: string | null;
  isRequestingPermission: boolean;
  onRequestPermission: () => Promise<boolean>;
}

const CameraPermissions: React.FC<CameraPermissionsProps> = ({
  hasCamera,
  permissionStatus,
  cameraError,
  isRequestingPermission,
  onRequestPermission,
}) => {
  const needsPermission = hasCamera && (permissionStatus === 'unknown' || permissionStatus === 'prompt' || permissionStatus === 'denied');

  if (!hasCamera) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-gray-800/50 rounded-md">
        <CameraOff className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-center text-gray-400">
          {cameraError || 'Cámara no disponible'}
        </p>
      </div>
    );
  }

  if (needsPermission) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center h-80 bg-gray-800/50 rounded-md mb-6">
          <Camera className="w-16 h-16 text-gray-400 mb-4" />
          <div className="text-center mb-4">
            <p className="text-lg font-medium mb-2">Permisos de Cámara Requeridos</p>
            <p className="text-sm text-gray-400">Se necesita acceso a la cámara para escanear códigos QR</p>
            {permissionStatus === 'denied' && (
              <p className="text-xs text-red-400 mt-2">
                Ve a la configuración del navegador para permitir el acceso
              </p>
            )}
          </div>
        </div>
        
        <Button
          className="px-6 py-3 bg-dorado text-empresarial font-semibold hover:bg-dorado/90 disabled:opacity-50"
          onClick={onRequestPermission}
          disabled={isRequestingPermission}
        >
          <Camera className="w-5 h-5 mr-2" />
          {isRequestingPermission ? 'Solicitando Permisos...' : 'Solicitar Permisos de Cámara'}
        </Button>

        {cameraError && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-red-400 text-sm text-center">{cameraError}</p>
            <p className="text-xs text-gray-400 text-center mt-1">
              {permissionStatus === 'denied' ? 
                'Ve a la configuración del navegador para permitir el acceso a la cámara' :
                'Asegúrate de permitir el acceso a la cámara cuando se solicite'
              }
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default CameraPermissions;
