import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';
import QrScanner from 'qr-scanner';

interface ScannerVideoProps {
  scanning: boolean;
  selectedControlType: string;
  controlTypeName?: string;
  hasCamera: boolean;
  permissionStatus: 'unknown' | 'granted' | 'denied' | 'prompt';
  onStartScanning: () => void;
  onStopScanning: () => void;
  onQRDetected: (data: string) => void;
  isProcessing: boolean;
}

const ScannerVideo: React.FC<ScannerVideoProps> = ({
  scanning,
  selectedControlType,
  controlTypeName,
  hasCamera,
  permissionStatus,
  onStartScanning,
  onStopScanning,
  onQRDetected,
  isProcessing,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Initialize and start QR Scanner
  useEffect(() => {
    if (!scanning || !videoRef.current || qrScannerRef.current) {
      return;
    }

    console.log('🚀 Initializing QR Scanner...');

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const qrData = result?.data?.trim();
        console.log('✅ QR Detected:', qrData);
        
        if (qrData) {
          onQRDetected(qrData);
        }
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 2,
        preferredCamera: 'environment',
      }
    );

    qrScannerRef.current = scanner;
    scanner.setInversionMode('both');

    scanner.start()
      .then(() => {
        console.log('✅ Scanner started successfully');
      })
      .catch((error) => {
        console.error('❌ Error starting scanner:', error);
        onStopScanning();
      });

    return () => {
      if (qrScannerRef.current) {
        console.log('🛑 Cleaning up scanner');
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [scanning, onQRDetected, onStopScanning]);

  // Stop scanner when scanning becomes false
  useEffect(() => {
    if (!scanning && qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
  }, [scanning]);

  const canStartScanning = hasCamera && permissionStatus === 'granted' && !scanning;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-[320px] aspect-square rounded-md mb-4 md:mb-6 relative overflow-hidden scanner-video bg-gray-950 border-2 border-gray-800">
        {canStartScanning && (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <Camera className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mb-3 md:mb-4" />
            <div className="text-center mb-3 md:mb-4">
              <p className="text-base md:text-lg font-medium">Presiona para activar la cámara</p>
              <p className="text-xs md:text-sm text-gray-400 mt-1">Apunta la cámara al código QR</p>
              {selectedControlType && controlTypeName && (
                <div className="mt-2 flex items-center justify-center gap-2 text-dorado text-sm">
                  <span className="capitalize">{controlTypeName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {scanning && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover transform-gpu will-change-transform"
              playsInline
              muted
              autoPlay
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 text-white px-3 py-2 rounded-lg">
                <p className="text-center text-sm">
                  Escaneando... Apunta al código QR
                </p>
                <p className="text-xs text-center mt-1">
                  Control: {controlTypeName}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {canStartScanning && (
        <Button
          className="w-full max-w-[320px] px-6 py-3 bg-dorado text-empresarial font-semibold hover:bg-dorado/90 disabled:opacity-50 touch-manipulation min-h-[48px]"
          onClick={onStartScanning}
          disabled={!selectedControlType || isProcessing}
        >
          <Camera className="w-5 h-5 mr-2" />
          Activar Cámara
        </Button>
      )}
      
      {scanning && (
        <Button
          className="w-full max-w-[320px] px-6 py-3 bg-red-600 text-white font-semibold hover:bg-red-700 touch-manipulation min-h-[48px]"
          onClick={onStopScanning}
        >
          <CameraOff className="w-5 h-5 mr-2" />
          Detener Escaneo
        </Button>
      )}
    </div>
  );
};

export default ScannerVideo;
