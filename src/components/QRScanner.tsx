
import React, { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { toast } from "@/components/ui/sonner";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useControlTypes, useProcessQRCode } from '@/hooks/useSupabaseData';
import { Ticket, Utensils, Wine, Crown, Camera, CameraOff } from 'lucide-react';

const QRScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [selectedControlType, setSelectedControlType] = useState<string>('');
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<null | { 
    success: boolean; 
    attendee?: any;
    usageCount?: number;
    controlType?: string;
  }>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  const { data: controlTypes, isLoading: loadingControlTypes } = useControlTypes();
  const processQRMutation = useProcessQRCode();

  // Set default control type to "ingreso"
  useEffect(() => {
    if (controlTypes && controlTypes.length > 0 && !selectedControlType) {
      const ingresoControl = controlTypes.find(ct => ct.name === 'ingreso');
      if (ingresoControl) {
        setSelectedControlType(ingresoControl.id);
      }
    }
  }, [controlTypes, selectedControlType]);

  // Check camera availability
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const hasCamera = await QrScanner.hasCamera();
        setHasCamera(hasCamera);
        
        if (!hasCamera) {
          setCameraError('No se detectó una cámara disponible');
        }
      } catch (error) {
        console.error('Error checking camera:', error);
        setCameraError('Error al verificar la cámara');
        setHasCamera(false);
      }
    };

    checkCamera();
  }, []);

  // Initialize QR Scanner
  useEffect(() => {
    if (videoRef.current && hasCamera) {
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data);
          processQRCode(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera if available
        }
      );

      qrScannerRef.current.setInversionMode('both');
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, [hasCamera]);

  const getControlIcon = (iconName: string | null) => {
    switch (iconName) {
      case 'ticket': return <Ticket className="w-6 h-6" />;
      case 'utensils': return <Utensils className="w-6 h-6" />;
      case 'wine': return <Wine className="w-6 h-6" />;
      case 'crown': return <Crown className="w-6 h-6" />;
      default: return <Ticket className="w-6 h-6" />;
    }
  };

  const startScanning = async () => {
    if (!selectedControlType) {
      toast.error('Por favor selecciona un tipo de control');
      return;
    }

    if (!hasCamera) {
      toast.error('No hay cámara disponible para escanear');
      return;
    }

    try {
      setScanning(true);
      setCameraError(null);
      
      if (qrScannerRef.current) {
        await qrScannerRef.current.start();
      }
    } catch (error: any) {
      console.error('Error starting camera:', error);
      setScanning(false);
      
      if (error.name === 'NotAllowedError') {
        setCameraError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara.');
        toast.error('Permisos de cámara requeridos', {
          description: 'Por favor, permite el acceso a la cámara para escanear códigos QR'
        });
      } else {
        setCameraError('Error al acceder a la cámara');
        toast.error('Error de cámara', {
          description: 'No se pudo acceder a la cámara'
        });
      }
    }
  };

  const stopScanning = () => {
    setScanning(false);
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
  };

  const processQRCode = async (ticketId: string) => {
    try {
      const result = await processQRMutation.mutateAsync({
        ticketId,
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

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tipo de Control
        </label>
        <Select value={selectedControlType} onValueChange={setSelectedControlType}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-hueso">
            <SelectValue placeholder="Selecciona el tipo de control" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {controlTypes?.map((controlType) => (
              <SelectItem key={controlType.id} value={controlType.id} className="text-hueso">
                <div className="flex items-center gap-2">
                  {getControlIcon(controlType.icon)}
                  <span className="capitalize">{controlType.name}</span>
                  <span className="text-xs text-gray-400">- {controlType.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-80 h-80 scan-border rounded-md mb-6 relative overflow-hidden">
        {!hasCamera && (
          <div className="flex flex-col items-center justify-center h-full bg-gray-800/50">
            <CameraOff className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-center text-gray-400">
              {cameraError || 'Cámara no disponible'}
            </p>
          </div>
        )}

        {hasCamera && !scanning && !lastResult && (
          <div className="flex flex-col items-center justify-center h-full">
            <Camera className="w-16 h-16 text-gray-400 mb-4" />
            <div className="text-center mb-4">
              <p className="text-lg font-medium">Presiona para activar la cámara</p>
              <p className="text-sm text-gray-400">Apunta la cámara al código QR</p>
              {selectedControlType && (
                <div className="mt-2 flex items-center justify-center gap-2 text-dorado">
                  {getControlIcon(controlTypes?.find(ct => ct.id === selectedControlType)?.icon || null)}
                  <span className="capitalize">
                    {controlTypes?.find(ct => ct.id === selectedControlType)?.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {hasCamera && scanning && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 text-white px-4 py-2 rounded-lg">
                <p className="text-center">
                  Escaneando... Apunta al código QR
                </p>
                <p className="text-xs text-center mt-1">
                  Control: {controlTypes?.find(ct => ct.id === selectedControlType)?.name}
                </p>
              </div>
            </div>
          </>
        )}
        
        {lastResult && (
          <div className={`flex items-center justify-center h-full p-4 ${lastResult.success ? 'bg-green-800/20' : 'bg-red-800/20'}`}>
            <div className="text-center">
              <div className={`text-5xl mb-2 ${lastResult.success ? 'text-green-500' : 'text-red-500'}`}>
                {lastResult.success ? '✓' : '✗'}
              </div>
              <p className="text-lg font-medium">
                {lastResult.success ? 'Control Registrado' : 'Control Denegado'}
              </p>
              {lastResult.attendee && (
                <>
                  <p className="text-sm mt-1">
                    {lastResult.attendee.name} - {lastResult.attendee.company}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {lastResult.controlType} - Uso #{lastResult.usageCount}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {hasCamera && !scanning && !lastResult && (
        <Button
          className="px-6 py-3 bg-dorado text-empresarial font-semibold hover:bg-dorado/90 disabled:opacity-50"
          onClick={startScanning}
          disabled={!selectedControlType || processQRMutation.isPending}
        >
          <Camera className="w-5 h-5 mr-2" />
          Activar Cámara
        </Button>
      )}
      
      {scanning && (
        <Button
          className="px-6 py-3 bg-red-600 text-white font-semibold hover:bg-red-700"
          onClick={stopScanning}
        >
          <CameraOff className="w-5 h-5 mr-2" />
          Detener Escaneo
        </Button>
      )}

      {cameraError && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400 text-sm text-center">{cameraError}</p>
          <p className="text-xs text-gray-400 text-center mt-1">
            Asegúrate de permitir el acceso a la cámara en tu navegador
          </p>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
