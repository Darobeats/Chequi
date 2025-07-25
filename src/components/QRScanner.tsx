
import React, { useState, useEffect } from 'react';
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
  const [lastResult, setLastResult] = useState<null | { 
    success: boolean; 
    attendee?: any;
    usageCount?: number;
    controlType?: string;
  }>(null);

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

  // Función de prueba temporal para debug
  const testQRScan = async () => {
    const testQRCode = 'EVT-BAS-93F8-2025'; // QR de Azula
    console.log('🧪 TESTING QR SCAN with:', testQRCode);
    console.log('🧪 Selected control type:', selectedControlType);
    console.log('🧪 Control types available:', controlTypes);
    
    if (!selectedControlType) {
      console.error('❌ No control type selected!');
      toast.error('Por favor selecciona un tipo de control');
      return;
    }
    
    // Buscar el control type por ID para confirmar
    const controlType = controlTypes?.find(ct => ct.id === selectedControlType);
    console.log('🧪 Found control type:', controlType);
    
    try {
      console.log('🧪 Calling processQRMutation.mutateAsync...');
      const result = await processQRMutation.mutateAsync({
        ticketId: testQRCode,
        controlType: selectedControlType
      });
      console.log('🧪 SUCCESS! Result:', result);
      
      // Mostrar resultado exitoso
      const selectedControl = controlTypes?.find(ct => ct.id === selectedControlType);
      setLastResult({ 
        success: true, 
        attendee: result.attendee,
        usageCount: result.usageCount,
        controlType: selectedControl?.name 
      });
      
      toast.success('✅ TEST EXITOSO - Control registrado', {
        description: `${selectedControl?.description} - ${result.attendee.name}`
      });
      
    } catch (error) {
      console.error('🧪 ERROR in test:', error);
      setLastResult({ success: false });
      toast.error('❌ ERROR EN TEST', {
        description: error.message
      });
    }
  };

  const processQRCode = async (ticketId: string) => {
    const cleanedData = ticketId.trim();
    console.log('🚨 QRScanner - Received data original:', `"${ticketId}"`);
    console.log('🚨 QRScanner - Received data cleaned:', `"${cleanedData}"`);
    console.log('🚨 QRScanner - Data length:', ticketId.length, '→', cleanedData.length);
    console.log('🚨 QRScanner - Data type:', typeof ticketId);
    console.log('🚨 QRScanner - Selected control type:', selectedControlType);
    console.log('🚨 QRScanner - Characters check:', [...cleanedData.slice(0, 10)].map(c => `${c}(${c.charCodeAt(0)})`));
    
    try {
      const result = await processQRMutation.mutateAsync({
        ticketId: cleanedData,
        controlType: selectedControlType
      });

      const selectedControl = controlTypes?.find(ct => ct.id === selectedControlType);
      
      setLastResult({ 
        success: true, 
        attendee: result.attendee,
        usageCount: result.usageCount,
        controlType: selectedControl?.name 
      });
      
      toast.success('Control registrado exitosamente', {
        description: `${selectedControl?.description} - ${result.attendee.name}`
      });
    } catch (error: any) {
      setLastResult({ success: false });
      toast.error('Error al procesar el código QR', {
        description: error.message
      });
    }
    
    stopScanning();
  };

  // Reset the scanner after showing the result
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (lastResult) {
      timer = setTimeout(() => {
        setLastResult(null);
      }, 4000);
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

      {/* Botón de prueba temporal para debugging */}
      <button 
        onClick={testQRScan}
        className="mb-4 px-4 py-2 bg-red-500 text-white rounded"
      >
        🧪 TEST QR SCAN (Azula - EVT-BAS-93F8-2025)
      </button>

      {lastResult ? (
        <ScanResult result={lastResult} />
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
