import { useEffect, useRef, useState } from 'react';
import { analyzeFrame } from '@/lib/frameQuality';
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
  /** Modo kiosko: captura y analiza automáticamente cuando la cédula está quieta y nítida */
  autoMode?: boolean;
}

export const CedulaScanner = ({ onScanSuccess, isActive, autoMode = false }: CedulaScannerProps) => {
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
  const [autoHint, setAutoHint] = useState<string>('Acerca la cédula al recuadro');
  const autoBusyRef = useRef(false);

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

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const capturePhoto = () => {
    const imageData = captureFrame();
    if (!imageData) return;
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

  // Arranque automático de cámara en modo kiosko
  useEffect(() => {
    if (autoMode && isActive && !isCameraActive && !capturedImage && permissionStatus !== 'denied') {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, isActive, capturedImage]);

  useEffect(() => () => stopCamera(), []); // liberar cámara al desmontar

  // Bucle de detección: espera movimiento (nuevo documento), luego estabilidad + nitidez
  useEffect(() => {
    if (!autoMode || !isActive || !isCameraActive || capturedImage) return;
    const small = document.createElement('canvas');
    small.width = 160; small.height = 100;
    const ctx = small.getContext('2d', { willReadFrequently: true });
    let prev: Uint8ClampedArray | null = null;
    let armed = false;
    let stableCount = 0;
    const startedAt = Date.now();
    const id = window.setInterval(async () => {
      const v = videoRef.current;
      if (!v || !ctx || v.readyState < 2 || autoBusyRef.current) return;
      ctx.drawImage(v, 0, 0, small.width, small.height);
      const frame = ctx.getImageData(0, 0, small.width, small.height).data;
      const { sharpness, motion } = analyzeFrame(frame, prev, small.width, small.height);
      prev = frame;
      if (motion > 12) { armed = true; stableCount = 0; setAutoHint('Mantén la cédula quieta…'); return; }
      if (!armed || Date.now() - startedAt < 1200) return;
      if (motion < 5 && sharpness > 35) stableCount++; else stableCount = 0;
      if (stableCount >= 3) {
        autoBusyRef.current = true;
        armed = false; stableCount = 0;
        setAutoHint('Leyendo documento…');
        const img = captureFrame();
        if (!img) { autoBusyRef.current = false; return; }
        setCapturedImage(img);
        stopCamera();
        const result = await analyzeCedula(img);
        autoBusyRef.current = false;
        if (result && /^\d{5,12}$/.test(String(result.numeroCedula ?? '').replace(/\D/g, ''))) {
          onScanSuccess(result);
        } else {
          setAutoHint('No se pudo leer. Vuelve a acercar la cédula.');
          setCapturedImage(null);
        }
      }
    }, 450);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, isActive, isCameraActive, capturedImage]);

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

          {autoMode && (isCameraActive || capturedImage) && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end p-3">
              {isCameraActive && <div className="absolute inset-[12%] rounded-xl border-2 border-dorado/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />}
              <span className="relative z-10 rounded-full bg-black/70 px-4 py-1.5 text-sm font-semibold text-hueso flex items-center gap-2">
                {(isAnalyzing || capturedImage) && <Loader2 className="h-4 w-4 animate-spin" />}
                {isAnalyzing || capturedImage ? 'Leyendo documento…' : autoHint}
              </span>
            </div>
          )}
        </div>

        {!capturedImage && !autoMode && (
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

          {isCameraActive && !capturedImage && !autoMode && (
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1" size="lg">
                <Camera className="h-4 w-4 mr-2" />{t('cedulaScanner.capturePhoto')}
              </Button>
              <Button onClick={stopCamera} variant="outline" size="lg">
                <CameraOff className="h-4 w-4" />
              </Button>
            </div>
          )}

          {capturedImage && !autoMode && (
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
