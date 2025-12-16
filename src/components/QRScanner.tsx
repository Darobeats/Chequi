import React, { useState, useEffect, useRef } from 'react';
import { toast } from "@/components/ui/sonner";
import { useControlTypes, useProcessQRCode } from '@/hooks/useSupabaseData';
import { useCameraPermissions } from '@/hooks/useCameraPermissions';
import { useOfflineScans } from '@/hooks/useOfflineScans';
import { useEventContext } from '@/context/EventContext';
import EventSelector from './scanner/EventSelector';
import ControlTypeSelector from './scanner/ControlTypeSelector';
import CameraPermissions from './scanner/CameraPermissions';
import ScannerVideo from './scanner/ScannerVideo';
import ScanResult from './scanner/ScanResult';
import OfflineSyncStatus from './scanner/OfflineSyncStatus';

interface QRScannerProps {
  selectedEventId?: string;
  onEventChange?: (eventId: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ selectedEventId: propEventId, onEventChange }) => {
  const { selectedEvent, isLoadingEvents } = useEventContext();
  
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
  
  // Use context event or prop event
  const selectedEventId = selectedEvent?.id || propEventId || '';

  const { data: controlTypes, isLoading: loadingControlTypes } = useControlTypes();
  const processQRMutation = useProcessQRCode();
  const {
    hasCamera,
    cameraError,
    permissionStatus,
    isRequestingPermission,
    requestCameraPermission,
  } = useCameraPermissions();
  
  const {
    pendingScans,
    addPendingScan,
    syncPendingScans,
    isSyncing,
    isOnline,
    hasPendingScans
  } = useOfflineScans();

  // Notify parent of event change
  useEffect(() => {
    if (selectedEvent?.id && onEventChange) {
      onEventChange(selectedEvent.id);
    }
  }, [selectedEvent?.id, onEventChange]);

  // Set default control type to "ingreso"
  useEffect(() => {
    if (controlTypes && controlTypes.length > 0 && !selectedControlType) {
      const ingresoControl = controlTypes.find(ct => ct.name === 'ingreso');
      if (ingresoControl) {
        setSelectedControlType(ingresoControl.id);
      }
    }
  }, [controlTypes, selectedControlType]);

  // Reset state when event changes
  useEffect(() => {
    setSelectedControlType('');
    setLastScannedCode('');
    setLastResult(null);
    setScanning(false);
  }, [selectedEventId]);

  const startScanning = async () => {
    if (!selectedEventId) {
      toast.error('Por favor selecciona un evento');
      return;
    }

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

    // Resetear el último código escaneado al reactivar la cámara
    setLastScannedCode('');
    setLastResult(null);
    setScanning(true);
  };

  const stopScanning = () => {
    setScanning(false);
  };


  const processQRCode = async (ticketId: string) => {
    const cleanedData = ticketId.trim();
    
    console.log('🔍 [QRScanner] QR Code received:', cleanedData);

    // Bloqueo sincronizado para evitar múltiples procesamientos simultáneos
    if (processingRef.current) {
      console.log('⏳ [QRScanner] Processing in progress, ignoring');
      return;
    }

    // Evitar procesamiento duplicado del mismo código
    if (cleanedData === lastScannedCode) {
      console.log('🚫 [QRScanner] Duplicate QR, ignoring');
      return;
    }

    processingRef.current = true;
    setLastScannedCode(cleanedData);
    setScanning(false);

    console.log('✅ [QRScanner] Processing QR code:', cleanedData);
    console.log('📋 [QRScanner] Event ID:', selectedEventId);
    console.log('🎯 [QRScanner] Control Type:', selectedControlType);

    try {
      // If offline, save scan locally
      if (!isOnline) {
        addPendingScan({
          ticketId: cleanedData,
          controlTypeId: selectedControlType,
          eventId: selectedEventId,
          device: `Scanner Web - ${navigator.userAgent?.split(' ')[0] || 'Unknown'}`
        });
        
        // Show success for offline scan
        const selectedControl = controlTypes?.find((ct) => ct.id === selectedControlType);
        setLastResult({
          success: true,
          message: 'Escaneo guardado localmente (sin conexión)',
          controlType: selectedControl?.name
        });
        
        processingRef.current = false;
        return;
      }

      const result = await processQRMutation.mutateAsync({
        ticketId: cleanedData,
        controlType: selectedControlType,
        eventId: selectedEventId,
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

  // Reset de resultado después de mostrarlo
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (lastResult) {
      const duration = lastResult.success ? 3500 : 4000; // Reducido para escaneos consecutivos más rápidos
      timer = setTimeout(() => {
        setLastResult(null);
        setLastScannedCode(''); // permitir re-escaneo del mismo código
      }, duration);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [lastResult]);

  // Función para cerrar el resultado y permitir nuevo escaneo inmediatamente
  const handleCloseResult = () => {
    setLastResult(null);
    setLastScannedCode(''); // Permitir escanear el mismo QR de nuevo
  };

  if (isLoadingEvents || loadingControlTypes) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="text-hueso">Cargando...</p>
      </div>
    );
  }

  const selectedControlTypeName = controlTypes?.find(ct => ct.id === selectedControlType)?.name;
  const needsPermission = hasCamera && (permissionStatus === 'unknown' || permissionStatus === 'prompt' || permissionStatus === 'denied');

  return (
    <div className="flex flex-col items-center justify-center touch-manipulation">
      <OfflineSyncStatus
        isOnline={isOnline}
        pendingCount={pendingScans.length}
        isSyncing={isSyncing}
        onSync={syncPendingScans}
      />

      <EventSelector />

      <ControlTypeSelector
        controlTypes={controlTypes}
        selectedControlType={selectedControlType}
        onControlTypeChange={setSelectedControlType}
        isLoading={loadingControlTypes}
      />


      {lastResult ? (
        <ScanResult result={lastResult} onClose={handleCloseResult} />
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
