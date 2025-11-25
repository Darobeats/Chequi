import { useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { parseCedulaData } from '@/utils/cedulaParser';
import type { CedulaData } from '@/types/cedula';
import { toast } from 'sonner';

export function useCedulaScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<CedulaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const startScanning = useCallback(async (
    elementId: string,
    onSuccess: (data: CedulaData) => void
  ) => {
    try {
      setError(null);
      
      const scanner = new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.PDF_417],
        verbose: false
      });
      
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 300, height: 150 },
          aspectRatio: 2.0
        },
        (decodedText) => {
          const parsed = parseCedulaData(decodedText);
          
          if (parsed) {
            setLastScan(parsed);
            onSuccess(parsed);
            
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
            
            toast.success('Cédula escaneada correctamente');
          } else {
            setError('No se pudieron interpretar los datos de la cédula');
            toast.error('Error al interpretar la cédula');
          }
        },
        () => {}
      );
      
      setIsScanning(true);
      
    } catch (err: any) {
      const errorMsg = err.message || 'Error iniciando el escáner';
      setError(errorMsg);
      setIsScanning(false);
      toast.error(errorMsg);
    }
  }, []);
  
  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  }, []);
  
  return {
    isScanning,
    lastScan,
    error,
    startScanning,
    stopScanning,
    clearLastScan: () => setLastScan(null),
    clearError: () => setError(null)
  };
}
