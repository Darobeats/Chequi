import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, AlertCircle, Loader2, IdCard, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCameraPermissions } from '@/hooks/useCameraPermissions';
import { useCedulaAI } from '@/hooks/useCedulaAI';
import { useTranslation } from 'react-i18next';
import type { CedulaData } from '@/types/cedula';

interface CedulaScannerProps {
  onScanSuccess: (data: CedulaData) => void;
  isActive: boolean;
}

export const CedulaScanner = ({ onScanSuccess, isActive }: CedulaScannerProps) => {
  const { t } = useTranslation('common');
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

  const startCamera = async () => {
    try {
      if (permissionStatus !== 'granted') {
        const granted = await requestCameraPermission();
        if (!granted) return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });

      streamRef.current = stream;
      setIsCameraActive(true);
      
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch (error) {
      console.error('Error al iniciar cámara:', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  };

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

  const handleAnalyze = async () => {
    if (!capturedImage) return;
    const result = await analyzeCedula(capturedImage);
    if (result) onScanSuccess(result);
  };

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
          <CardTitle>{t('cedulaScanner.title')}</CardTitle>
        </div>
        <CardDescription dangerouslySetInnerHTML={{ __html: t('cedulaScanner.description') }} />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {cameraError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{cameraError}</AlertDescription>
          </Alert>
        )}

        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
          {needsPermission && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-background/95 z-10">
              <CameraOff className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                {t('cedulaScanner.permissionRequired')}
              </p>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${(!isCameraActive || capturedImage) ? 'hidden' : ''}`}
          />

          {capturedImage && (
            <img src={capturedImage} alt="Cédula capturada" className="w-full h-full object-contain" />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {!capturedImage && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t('cedulaScanner.instructionsTitle')}</p>
            <ul className="space-y-1 list-disc list-inside">
              <li dangerouslySetInnerHTML={{ __html: t('cedulaScanner.instruction1') }} />
              <li dangerouslySetInnerHTML={{ __html: t('cedulaScanner.instruction2') }} />
              <li dangerouslySetInnerHTML={{ __html: t('cedulaScanner.instruction3') }} />
              <li>{t('cedulaScanner.instruction4')}</li>
              <li>{t('cedulaScanner.instruction5')}</li>
            </ul>
          </div>
        )}

        <div className="space-y-2">
          {!isCameraActive && !capturedImage && (
            <Button onClick={startCamera} disabled={!hasCamera || isRequestingPermission} className="w-full" size="lg">
              {isRequestingPermission ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('cedulaScanner.requestingPermissions')}</>
              ) : (
                <><Camera className="h-4 w-4 mr-2" />{needsPermission ? t('cedulaScanner.allowCamera') : t('cedulaScanner.startCamera')}</>
              )}
            </Button>
          )}

          {isCameraActive && !capturedImage && (
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1" size="lg">
                <Camera className="h-4 w-4 mr-2" />{t('cedulaScanner.capturePhoto')}
              </Button>
              <Button onClick={stopCamera} variant="outline" size="lg">
                <CameraOff className="h-4 w-4" />
              </Button>
            </div>
          )}

          {capturedImage && (
            <div className="flex gap-2">
              <Button onClick={handleAnalyze} disabled={isAnalyzing} className="flex-1" size="lg">
                {isAnalyzing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('cedulaScanner.analyzingAI')}</>
                ) : (
                  <><IdCard className="h-4 w-4 mr-2" />{t('cedulaScanner.analyzeAI')}</>
                )}
              </Button>
              <Button onClick={handleRetry} disabled={isAnalyzing} variant="outline" size="lg">
                <RotateCcw className="h-4 w-4 mr-2" />{t('cedulaScanner.retry')}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
