import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, AlertCircle, Loader2, IdCard, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCameraPermissions } from '@/hooks/useCameraPermissions';
import { useCedulaAI } from '@/hooks/useCedulaAI';
import type { CedulaData } from '@/types/cedula';

interface CedulaScannerProps {
  onScanSuccess: (data: CedulaData) => void;
  isActive: boolean;
}

export const CedulaScanner = ({ onScanSuccess, isActive }: CedulaScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const {
    hasCamera,
    cameraError,
    permissionStatus,
    isRequestingPermission,
    requestCameraPermission
  } = useCameraPermissions();

  const { analyzeCedula, isAnalyzing } = useCedulaAI();

  // Iniciar cámara
  const startCamera = async () => {
    try {
      console.log('🎥 Iniciando cámara...');
      
      if (permissionStatus !== 'granted') {
        console.log('🔐 Solicitando permisos...');
        const granted = await requestCameraPermission();
        if (!granted) {
          console.log('❌ Permisos denegados');
          return;
        }
        console.log('✅ Permisos concedidos');
      }

      console.log('📹 Solicitando stream de cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      console.log('🎥 Stream obtenido:', stream.active);
      streamRef.current = stream;
      
      // Primero actualizar el estado para renderizar el video visible
      setIsCameraActive(true);
      
      // Luego asignar el stream después de que React actualice el DOM
      requestAnimationFrame(() => {
        console.log('🎥 Video ref disponible:', !!videoRef.current);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('✅ Stream asignado al video');
        } else {
          console.error('❌ Video ref no está disponible');
        }
      });
    } catch (error) {
      console.error('❌ Error al iniciar cámara:', error);
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capturar foto
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    stopCamera();
  };

  // Analizar foto con IA
  const handleAnalyze = async () => {
    if (!capturedImage) return;

    const result = await analyzeCedula(capturedImage);
    if (result) {
      onScanSuccess(result);
    }
  };

  // Reintentar
  const handleRetry = () => {
    setCapturedImage(null);
    startCamera();
  };

  const needsPermission = permissionStatus === 'prompt' || permissionStatus === 'denied';

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <IdCard className="h-5 w-5 text-dorado" />
          <CardTitle>Capturar Cédula de Ciudadanía</CardTitle>
        </div>
        <CardDescription>
          Toma una foto del <strong>frente</strong> de la cédula para extraer los datos
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Mensajes de error */}
        {cameraError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{cameraError}</AlertDescription>
          </Alert>
        )}

        {/* Área de video/foto */}
        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
          {needsPermission && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-background/95 z-10">
              <CameraOff className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Se requieren permisos de cámara para capturar la cédula
              </p>
            </div>
          )}

          {/* Video SIEMPRE en el DOM, visible solo cuando está activo */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${(!isCameraActive || capturedImage) ? 'hidden' : ''}`}
          />

          {/* Foto capturada superpuesta */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Cédula capturada"
              className="w-full h-full object-contain"
            />
          )}

          {/* Canvas oculto para captura */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Instrucciones */}
        {!capturedImage && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Instrucciones para mejor captura:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Toma foto del <strong>frente</strong> de la cédula (donde está la foto)</li>
              <li>Asegura buena <strong>iluminación</strong> sin reflejos</li>
              <li>Mantén la cédula <strong>plana</strong> y enfocada</li>
              <li>Llena el cuadro con la cédula sin cortar información</li>
              <li>La IA extraerá: número, nombres y apellidos automáticamente</li>
            </ul>
          </div>
        )}

        {/* Botones de control */}
        <div className="space-y-2">
          {!isCameraActive && !capturedImage && (
            <Button 
              onClick={startCamera}
              disabled={!hasCamera || isRequestingPermission}
              className="w-full"
              size="lg"
            >
              {isRequestingPermission ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Solicitando permisos...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  {needsPermission ? 'Permitir Acceso a Cámara' : 'Iniciar Cámara'}
                </>
              )}
            </Button>
          )}

          {isCameraActive && !capturedImage && (
            <div className="flex gap-2">
              <Button 
                onClick={capturePhoto}
                className="flex-1"
                size="lg"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar Foto
              </Button>
              <Button 
                onClick={stopCamera}
                variant="outline"
                size="lg"
              >
                <CameraOff className="h-4 w-4" />
              </Button>
            </div>
          )}

          {capturedImage && (
            <div className="flex gap-2">
              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex-1"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando con IA...
                  </>
                ) : (
                  <>
                    <IdCard className="h-4 w-4 mr-2" />
                    Analizar con IA
                  </>
                )}
              </Button>
              <Button 
                onClick={handleRetry}
                disabled={isAnalyzing}
                variant="outline"
                size="lg"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
