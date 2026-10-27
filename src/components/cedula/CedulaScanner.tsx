import { useEffect, useRef, useState } from 'react';
import { analyzeFrame, AutoCaptureGate } from '@/lib/frameQuality';
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
  const [autoProgress, setAutoProgress] = useState(0);
  const autoBusyRef = useRef(false);
  const lastFailedRef = useRef(false);
  const onScanRef = useRef(onScanSuccess);
  onScanRef.current = onScanSuccess;

  const startCamera = async () => {
    try {
      if (permissionStatus !== 'granted') {
        const granted = await requestCameraPermission();
        if (!granted) return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment' } });
      }

      // Enfoque y exposición continuos cuando el dispositivo lo soporte
      const track = stream.getVideoTracks()[0];
      try {
        const caps = (track?.getCapabilities?.() ?? {}) as Record<string, unknown>;
        const advanced: Record<string, unknown> = {};
        if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) advanced.focusMode = 'continuous';
        if (Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) advanced.exposureMode = 'continuous';
        if (Object.keys(advanced).length) await track.applyConstraints({ advanced: [advanced as MediaTrackConstraintSet] });
      } catch { /* no soportado (iOS Safari): se ignora */ }

      streamRef.current = stream;
      setIsCameraActive(true);

      requestAnimationFrame(() => {
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.setAttribute('playsinline', 'true');
          v.muted = true;
          const play = () => v.play().catch(() => {});
          if (v.readyState >= 1) play(); else v.onloadedmetadata = play;
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
    if (!video.videoWidth || !video.videoHeight) return null;
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
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

  const runAutoCapture = async () => {
    if (autoBusyRef.current) return;
    autoBusyRef.current = true;
    setAutoHint('Leyendo documento…');
    const img = captureFrame();
    if (!img) { autoBusyRef.current = false; return; }
    setCapturedImage(img);
    stopCamera();
    const result = await analyzeCedula(img);
    autoBusyRef.current = false;
    if (result && /^\d{5,12}$/.test(String(result.numeroCedula ?? '').replace(/\D/g, ''))) {
      lastFailedRef.current = false;
      onScanRef.current(result);
    } else {
      lastFailedRef.current = true;
      setAutoHint('No se pudo leer. Retira y vuelve a acercar la cédula.');
      setCapturedImage(null);
    }
  };

  // Bucle de detección: estabilidad + nitidez relativa (sin exigir movimiento previo), con respaldo por tiempo
  useEffect(() => {
    if (!autoMode || !isActive || !isCameraActive || capturedImage) return;
    const small = document.createElement('canvas');
    const ctx = small.getContext('2d', { willReadFrequently: true });
    let prev: Uint8ClampedArray | null = null;
    const gate = new AutoCaptureGate(Date.now(), { requireMotion: lastFailedRef.current });
    setAutoProgress(0);
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !ctx || v.readyState < 2 || !v.videoWidth || autoBusyRef.current) return;
      // Región central (coincide con la guía), sin deformar la proporción real
      const sx = v.videoWidth * 0.12, sy = v.videoHeight * 0.12;
      const sw = v.videoWidth * 0.76, sh = v.videoHeight * 0.76;
      const w = 160, h = Math.max(40, Math.round(160 * sh / sw));
      if (small.width !== w || small.height !== h) { small.width = w; small.height = h; prev = null; }
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
      const frame = ctx.getImageData(0, 0, w, h).data;
      const { sharpness, motion } = analyzeFrame(frame, prev, w, h);
      prev = frame;
      const r = gate.push(sharpness, motion, Date.now());
      setAutoProgress(r.progress);
      if (r.fire) { void runAutoCapture(); return; }
      setAutoHint(motion > 12 ? 'Mantén la cédula quieta…' : 'Enfocando la cédula…');
    }, 300);
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
              {isCameraActive && !capturedImage && (
                <div className="relative z-10 mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-black/50">
                  <div className="h-full bg-dorado transition-all duration-300" style={{ width: `${Math.round(autoProgress * 100)}%` }} />
                </div>
              )}
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

          {isCameraActive && !capturedImage && autoMode && (
            <Button onClick={() => void runAutoCapture()} disabled={isAnalyzing} variant="outline" className="w-full" size="lg">
              <Camera className="h-4 w-4 mr-2" />Capturar ahora
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
