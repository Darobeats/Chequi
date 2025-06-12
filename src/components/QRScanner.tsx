
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
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
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

  // Check camera availability and permissions
  useEffect(() => {
    const checkCameraAndPermissions = async () => {
      try {
        console.log('Checking camera availability...');
        const hasCamera = await QrScanner.hasCamera();
        setHasCamera(hasCamera);
        
        if (!hasCamera) {
          setCameraError('No se detectó una cámara disponible en este dispositivo');
          return;
        }

        // Check current permission status
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
            setPermissionStatus(permission.state);
            console.log('Camera permission status:', permission.state);
            
            // Listen for permission changes
            permission.onchange = () => {
              setPermissionStatus(permission.state);
              console.log('Camera permission changed to:', permission.state);
            };
          } catch (permError) {
            console.log('Permissions API not supported, will request on demand');
            setPermissionStatus('unknown');
          }
        }
      } catch (error) {
        console.error('Error checking camera:', error);
        setCameraError('Error al verificar la cámara');
        setHasCamera(false);
      }
    };

    checkCameraAndPermissions();
  }, []);

  // Initialize QR Scanner
  useEffect(() => {
    if (videoRef.current && hasCamera && permissionStatus === 'granted') {
      console.log('Initializing QR Scanner...');
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
  }, [hasCamera, permissionStatus]);

  const requestCameraPermission = async () => {
    if (!hasCamera) {
      toast.error('No hay cámara disponible en este dispositivo');
      return false;
    }

    setIsRequestingPermission(true);
    setCameraError(null);

    try {
      console.log('Requesting camera access...');
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Prefer back camera
        } 
      });
      
      console.log('Camera access granted');
      
      // Stop the stream immediately as QrScanner will handle it
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionStatus('granted');
      toast.success('Permisos de cámara concedidos');
      return true;
      
    } catch (error: any) {
      console.error('Camera permission error:', error);
      setPermissionStatus('denied');
      
      if (error.name === 'NotAllowedError') {
        setCameraError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara en la configuración del navegador.');
        toast.error('Permisos de cámara denegados', {
          description: 'Ve a la configuración del navegador y permite el acceso a la cámara para este sitio'
        });
      } else if (error.name === 'NotFoundError') {
        setCameraError('No se encontró una cámara en este dispositivo');
        toast.error('Cámara no encontrada');
      } else if (error.name === 'NotReadableError') {
        setCameraError('La cámara está siendo usada por otra aplicación');
        toast.error('Cámara ocupada', {
          description: 'Cierra otras aplicaciones que puedan estar usando la cámara'
        });
      } else {
        setCameraError('Error al acceder a la cámara: ' + error.message);
        toast.error('Error de cámara', {
          description: 'No se pudo acceder a la cámara'
        });
      }
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  };

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

    // Request permissions if not granted
    if (permissionStatus !== 'granted') {
      const granted = await requestCameraPermission();
      if (!granted) {
        return;
      }
    }

    try {
      setScanning(true);
      setCameraError(null);
      
      if (qrScannerRef.current) {
        console.log('Starting QR Scanner...');
        await qrScannerRef.current.start();
      }
    } catch (error: any) {
      console.error('Error starting camera:', error);
      setScanning(false);
      
      if (error.name === 'NotAllowedError') {
        setCameraError('Permisos de cámara denegados. Por favor, recarga la página y permite el acceso.');
        toast.error('Permisos de cámara requeridos', {
          description: 'Recarga la página y permite el acceso a la cámara'
        });
      } else {
        setCameraError('Error al iniciar la cámara: ' + error.message);
        toast.error('Error de cámara', {
          description: 'No se pudo iniciar la cámara'
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

  const canStartScanning = hasCamera && permissionStatus === 'granted' && !scanning && !lastResult;
  const needsPermission = hasCamera && (permissionStatus === 'unknown' || permissionStatus === 'prompt' || permissionStatus === 'denied');

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

        {hasCamera && needsPermission && (
          <div className="flex flex-col items-center justify-center h-full bg-gray-800/50">
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
        )}

        {canStartScanning && (
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
      
      {needsPermission && (
        <Button
          className="px-6 py-3 bg-dorado text-empresarial font-semibold hover:bg-dorado/90 disabled:opacity-50"
          onClick={requestCameraPermission}
          disabled={isRequestingPermission}
        >
          <Camera className="w-5 h-5 mr-2" />
          {isRequestingPermission ? 'Solicitando Permisos...' : 'Solicitar Permisos de Cámara'}
        </Button>
      )}
      
      {canStartScanning && (
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
            {permissionStatus === 'denied' ? 
              'Ve a la configuración del navegador para permitir el acceso a la cámara' :
              'Asegúrate de permitir el acceso a la cámara cuando se solicite'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
