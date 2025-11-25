import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, CameraOff, IdCard, Loader2, AlertCircle } from 'lucide-react';
import { useCedulaScanner } from '@/hooks/useCedulaScanner';
import { useCameraPermissions } from '@/hooks/useCameraPermissions';
import type { CedulaData } from '@/types/cedula';

interface CedulaScannerProps {
  onScanSuccess: (data: CedulaData) => void;
  isActive: boolean;
}

export function CedulaScanner({ onScanSuccess, isActive }: CedulaScannerProps) {
  const { 
    isScanning, 
    isInitializing,
    cameraReady,
    error, 
    startScanning, 
    stopScanning 
  } = useCedulaScanner();
  
  const {
    hasCamera,
    cameraError,
    permissionStatus,
    isRequestingPermission,
    requestCameraPermission,
  } = useCameraPermissions();
  
  const [hasStarted, setHasStarted] = useState(false);
  const scannerId = 'cedula-scanner-reader';

  useEffect(() => {
    if (isActive && hasStarted && !isScanning && permissionStatus === 'granted') {
      startScanning(scannerId, onScanSuccess);
    }
    
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isActive, hasStarted, permissionStatus]);

  const handleStartStop = async () => {
    if (isScanning) {
      await stopScanning();
      setHasStarted(false);
    } else {
      // Verificar permisos primero
      if (permissionStatus !== 'granted') {
        const granted = await requestCameraPermission();
        if (!granted) return;
      }
      
      // Solo cambiar el estado, el useEffect se encarga de iniciar el escáner
      setHasStarted(true);
    }
  };

  const needsPermission = permissionStatus === 'prompt' || permissionStatus === 'denied' || permissionStatus === 'unknown';
  const canStart = hasCamera && permissionStatus === 'granted' && !isScanning && !isInitializing;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <IdCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Escanear Cédula</h3>
        </div>

        {/* Contenedor del escáner con estructura separada */}
        <div className="relative w-full max-w-2xl mx-auto">
          {/* Contenedor LIMPIO para html5-qrcode - SIN overlays dentro */}
          <div 
            id={scannerId}
            className="w-full rounded-lg overflow-hidden bg-black min-h-[300px]"
          />
          
          {/* Overlays como hermanos del contenedor de video - NO dentro */}
          {/* Estado: Sin permisos */}
          {needsPermission && !hasStarted && (
            <div className="absolute inset-0 flex items-center justify-center p-8 bg-muted z-10 rounded-lg">
              <div className="text-center space-y-4">
                <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium mb-2">Se requieren permisos de cámara</p>
                  <p className="text-sm text-muted-foreground">
                    Necesitas autorizar el acceso a la cámara para escanear cédulas
                  </p>
                </div>
                <Button
                  onClick={requestCameraPermission}
                  disabled={isRequestingPermission || !hasCamera}
                  className="mt-4"
                >
                  {isRequestingPermission ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Solicitando...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Solicitar Permisos
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Estado: Inicializando cámara */}
          {isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/90 z-10 rounded-lg">
              <div className="text-center space-y-3">
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                <p className="text-sm font-medium">Iniciando cámara...</p>
                <p className="text-xs text-muted-foreground">Preparando escáner PDF417</p>
              </div>
            </div>
          )}

          {/* Estado: Sin iniciar */}
          {!hasStarted && !isInitializing && permissionStatus === 'granted' && (
            <div className="absolute inset-0 flex items-center justify-center p-8 bg-muted z-10 rounded-lg">
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Presiona el botón para activar la cámara y escanear el código PDF417 en el reverso de la cédula
                </p>
              </div>
            </div>
          )}

          {/* Estado: Escaneando (overlay sutil con área ampliada) */}
          {cameraReady && isScanning && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Área de escaneo más amplia (85% del ancho) */}
                <div className="border-2 border-primary rounded-lg w-[85%] max-w-[500px] aspect-[2.2/1] shadow-lg">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
                </div>
              </div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/90 px-4 py-2 rounded-lg text-xs font-medium">
                <p className="text-center">
                  📸 Escaneando en HD (1080p)
                </p>
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 px-4 py-2 rounded-full text-xs font-medium">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Buscando código PDF417...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Errores */}
        {(error || cameraError) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-xs mt-1">{error || cameraError}</p>
            </div>
          </div>
        )}

        {/* Instrucciones mejoradas */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-3">
          <p className="font-medium mb-2">💡 Instrucciones para mejor lectura:</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Reverso de la cédula:</strong> Escanea el código PDF417 (código de barras rectangular)</li>
            <li><strong>Distancia:</strong> Mantén la cédula a 15-25 cm de la cámara</li>
            <li><strong>Iluminación:</strong> Asegúrate de tener buena luz, evita sombras y reflejos</li>
            <li><strong>Ángulo:</strong> Coloca la cédula plana, paralela a la cámara (sin inclinación)</li>
            <li><strong>Estabilidad:</strong> Mantén la cédula quieta por 2-3 segundos dentro del área marcada</li>
            <li><strong>Detección automática:</strong> El sistema usa alta resolución (1080p) para mejor precisión</li>
          </ul>
        </div>

        {/* Botón principal */}
        <Button 
          onClick={handleStartStop}
          variant={isScanning ? 'destructive' : 'default'}
          size="lg"
          className="w-full"
          disabled={!canStart && !isScanning}
        >
          {isScanning ? (
            <>
              <CameraOff className="mr-2 h-5 w-5" />
              Detener Cámara
            </>
          ) : isInitializing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-5 w-5" />
              Activar Cámara
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
