
import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';
import QrScanner from 'qr-scanner';

console.log('[ScannerVideo] 🔧 QR Scanner imported successfully');
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

  // Initialize QR Scanner ONLY when the video element exists (i.e., when scanning is true)
  useEffect(() => {
    console.log('[ScannerVideo] 🔍 useEffect triggered:', { 
      hasCamera, 
      permissionStatus, 
      scanning, 
      videoElementExists: !!videoRef.current,
      scannerExists: !!qrScannerRef.current 
    });
    
    const canInit = hasCamera && permissionStatus === 'granted' && scanning && videoRef.current && !qrScannerRef.current;
    console.log('[ScannerVideo] 🤔 Can initialize scanner?', canInit);

    if (canInit) {
      console.log('[ScannerVideo] 🟢 Initializing QR Scanner...');
      console.log('[ScannerVideo] 📹 Video element:', videoRef.current);
      console.log('[ScannerVideo] 🔍 Scanner config: highlightScanRegion=true, maxScansPerSecond=5');
      
      // Configure worker path for this instance
      if (typeof QrScanner.WORKER_PATH === 'undefined') {
        try {
          QrScanner.WORKER_PATH = '/node_modules/qr-scanner/qr-scanner-worker.min.js';
          console.log('[ScannerVideo] 🛠️ Worker path set to:', QrScanner.WORKER_PATH);
        } catch (error) {
          console.log('[ScannerVideo] ⚠️ Could not set worker path, using default');
        }
      }
      
      qrScannerRef.current = new QrScanner(
        videoRef.current as HTMLVideoElement,
        (result) => {
          const data = (result?.data || '').trim();
          console.log('[ScannerVideo] 🎯 QR DETECTED RAW:', result);
          console.log('[ScannerVideo] 📄 QR Data cleaned:', data);
          console.log('[ScannerVideo] 📏 Data length:', data.length);
          
          if (data && data.length > 0) {
            console.log('[ScannerVideo] ✅ Calling onQRDetected with data:', data);
            onQRDetected(data);
          } else {
            console.log('[ScannerVideo] ⚠️ Empty or invalid QR data, skipping');
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 5, // Reduced for stability
          returnDetailedScanResult: true,
        }
      );

      console.log('[ScannerVideo] 🔄 Setting inversion mode to both...');
      // Helps with inverted codes or low contrast
      qrScannerRef.current.setInversionMode('both');

      console.log('[ScannerVideo] 🚀 Starting scanner...');
      
      // Test if QrScanner can access camera first
      QrScanner.hasCamera()
        .then(hasCamera => {
          console.log('[ScannerVideo] 📱 QrScanner.hasCamera():', hasCamera);
          if (!hasCamera) {
            console.error('[ScannerVideo] ❌ QrScanner reports no camera available');
            onStopScanning();
            return;
          }
          
          // Start the scanner
          return qrScannerRef.current?.start();
        })
        .then(() => {
          console.log('[ScannerVideo] ✅ QR Scanner started successfully and is ready to scan');
          console.log('[ScannerVideo] 📸 Scanner instance:', qrScannerRef.current);
        })
        .catch((error) => {
          console.error('[ScannerVideo] ❌ Error starting camera or scanner:', error);
          console.error('[ScannerVideo] 📋 Error details:', error.name, error.message);
          onStopScanning();
        });
    }

    // Cleanup when leaving scanning mode or unmounting
    return () => {
      if (!scanning && qrScannerRef.current) {
        console.log('[ScannerVideo] 🛑 Stopping QR Scanner...');
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [hasCamera, permissionStatus, scanning, onStopScanning, onQRDetected]);

  // Safety: stop scanner if scanning becomes false while instance exists
  useEffect(() => {
    if (!scanning && qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
  }, [scanning]);

  const canStartScanning = hasCamera && permissionStatus === 'granted' && !scanning;

  return (
    <div className="flex flex-col items-center">
      <div className="w-80 h-80 scan-border rounded-md mb-6 relative overflow-hidden scanner-video">
        {canStartScanning && (
          <div className="flex flex-col items-center justify-center h-full">
            <Camera className="w-16 h-16 text-gray-400 mb-4" />
            <div className="text-center mb-4">
              <p className="text-lg font-medium">Presiona para activar la cámara</p>
              <p className="text-sm text-gray-400">Apunta la cámara al código QR</p>
              {selectedControlType && controlTypeName && (
                <div className="mt-2 flex items-center justify-center gap-2 text-dorado">
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
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 text-white px-4 py-2 rounded-lg">
                <p className="text-center">
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
          className="px-6 py-3 bg-dorado text-empresarial font-semibold hover:bg-dorado/90 disabled:opacity-50"
          onClick={onStartScanning}
          disabled={!selectedControlType || isProcessing}
        >
          <Camera className="w-5 h-5 mr-2" />
          Activar Cámara
        </Button>
      )}
      
      {scanning && (
        <Button
          className="px-6 py-3 bg-red-600 text-white font-semibold hover:bg-red-700"
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
