
import React, { useState, useEffect, useRef } from 'react';
import { toast } from "@/components/ui/sonner";
import { useControlTypes, useProcessQRCode } from '@/hooks/useSupabaseData';
import { useCameraPermissions } from '@/hooks/useCameraPermissions';
import ControlTypeSelector from './scanner/ControlTypeSelector';
import CameraPermissions from './scanner/CameraPermissions';
import ScannerVideo from './scanner/ScannerVideo';
import ScanResult from './scanner/ScanResult';

const QRScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [selectedControlType, setSelectedControlType] = useState<string>('');
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [lastResult, setLastResult] = useState<null | { 
    success: boolean; 
    attendee?: any;
    usageCount?: number;
    maxUses?: number;
    controlType?: string;
    message?: string;
    lastUsage?: { used_at?: string; device?: string; control_type?: string } | null;
  }>(null);

  const processingRef = useRef(false);

  const { data: controlTypes, isLoading: loadingControlTypes } = useControlTypes();
  const processQRMutation = useProcessQRCode();
  const {
    hasCamera,
    cameraError,
    permissionStatus,
    isRequestingPermission,
    requestCameraPermission,
  } = useCameraPermissions();

  // Set default control type to "ingreso"
  useEffect(() => {
    if (controlTypes && controlTypes.length > 0 && !selectedControlType) {
      const ingresoControl = controlTypes.find(ct => ct.name === 'ingreso');
      if (ingresoControl) {
        setSelectedControlType(ingresoControl.id);
      }
    }
  }, [controlTypes, selectedControlType]);

  const startScanning = async () => {
    if (!selectedControlType) {
      toast.error('Por favor selecciona un tipo de control');
      return;
    }

    if (!hasCamera) {
      toast.error('No hay cámara disponible para escanear');
      return;
    }

    // Request permissions if not granted
    if (permissionStatus !== 'granted') {
      const granted = await requestCameraPermission();
      if (!granted) {
        return;
      }
    }

    setScanning(true);
  };

  const stopScanning = () => {
    setScanning(false);
  };


  const processQRCode = async (ticketId: string) => {
    const cleanedData = ticketId.trim();

    // Bloqueo sincronizado para evitar múltiples procesamientos simultáneos
    if (processingRef.current) {
      console.log('⏳ Procesamiento en curso, ignorando detección');
      return;
    }

    // Evitar procesamiento duplicado del mismo código (ráfagas de frames)
    if (cleanedData === lastScannedCode) {
      console.log('🚫 Código QR ya procesado, ignorando...');
      return;
    }

    processingRef.current = true;
    setLastScannedCode(cleanedData);
    setScanning(false); // detener cámara inmediatamente para evitar re-escaneos

    console.log('🚨 QRScanner - Processing QR:', cleanedData);

    try {
      const result = await processQRMutation.mutateAsync({
        ticketId: cleanedData,
        controlType: selectedControlType,
      });

      const selectedControl = controlTypes?.find((ct) => ct.id === selectedControlType);

      if (result.canAccess) {
        setLastResult({
          success: true,
          attendee: result.attendee,
          usageCount: result.usage?.currentUses || 0,
          maxUses: result.usage?.maxUses || 0,
          controlType: selectedControl?.name,
        });

        toast.success('Control registrado exitosamente', {
          description: `${selectedControl?.description || selectedControl?.name} - ${result.attendee?.name || ''}`,
        });
      } else {
        setLastResult({
          success: false,
          attendee: result.attendee,
          usageCount: result.usage?.currentUses || 0,
          maxUses: result.usage?.maxUses || 0,
          controlType: selectedControl?.name,
          message: result.message,
          lastUsage: result.lastUsage || null,
        });

        toast.error('QR no válido para este control', {
          description: result.message || 'El QR ya fue utilizado o no tiene acceso',
        });
      }
    } catch (error: any) {
      console.error('❌ Error procesando QR:', error);
      setLastResult({ success: false, message: error?.message || 'Error desconocido' });
      toast.error('Error al procesar el código QR', {
        description: error?.message,
      });
    } finally {
      processingRef.current = false;
    }
  };

  // Reset de resultado después de mostrarlo por más tiempo
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (lastResult) {
      const duration = lastResult.success ? 8000 : 7000; // éxito más tiempo
      timer = setTimeout(() => {
        setLastResult(null);
        setLastScannedCode(''); // permitir re-escaneo del mismo código
      }, duration);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [lastResult]);

  if (loadingControlTypes) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="text-hueso">Cargando tipos de control...</p>
      </div>
    );
  }

  const selectedControlTypeName = controlTypes?.find(ct => ct.id === selectedControlType)?.name;
  const needsPermission = hasCamera && (permissionStatus === 'unknown' || permissionStatus === 'prompt' || permissionStatus === 'denied');

  return (
    <div className="flex flex-col items-center justify-center">
      <ControlTypeSelector
        controlTypes={controlTypes}
        selectedControlType={selectedControlType}
        onControlTypeChange={setSelectedControlType}
        isLoading={loadingControlTypes}
      />


      {lastResult ? (
        <ScanResult result={lastResult} onClose={() => setLastResult(null)} />
      ) : needsPermission ? (
        <CameraPermissions
          hasCamera={hasCamera}
          permissionStatus={permissionStatus}
          cameraError={cameraError}
          isRequestingPermission={isRequestingPermission}
          onRequestPermission={requestCameraPermission}
        />
      ) : (
        <ScannerVideo
          scanning={scanning}
          selectedControlType={selectedControlType}
          controlTypeName={selectedControlTypeName}
          hasCamera={hasCamera}
          permissionStatus={permissionStatus}
          onStartScanning={startScanning}
          onStopScanning={stopScanning}
          onQRDetected={processQRCode}
          isProcessing={processQRMutation.isPending}
        />
      )}
    </div>
  );
};

export default QRScanner;
