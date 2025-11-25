import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, CameraOff, IdCard } from 'lucide-react';
import { useCedulaScanner } from '@/hooks/useCedulaScanner';
import type { CedulaData } from '@/types/cedula';

interface CedulaScannerProps {
  onScanSuccess: (data: CedulaData) => void;
  isActive: boolean;
}

export function CedulaScanner({ onScanSuccess, isActive }: CedulaScannerProps) {
  const { isScanning, error, startScanning, stopScanning } = useCedulaScanner();
  const [hasStarted, setHasStarted] = useState(false);
  const scannerId = 'cedula-scanner-reader';

  useEffect(() => {
    if (isActive && hasStarted && !isScanning) {
      startScanning(scannerId, onScanSuccess);
    }
    
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isActive, hasStarted]);

  const handleStartStop = async () => {
    if (isScanning) {
      await stopScanning();
      setHasStarted(false);
    } else {
      setHasStarted(true);
      await startScanning(scannerId, onScanSuccess);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <IdCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Escanear Cédula</h3>
        </div>

        <div 
          id={scannerId} 
          className="w-full rounded-lg overflow-hidden bg-muted min-h-[300px] flex items-center justify-center"
        >
          {!hasStarted && (
            <div className="text-center p-8">
              <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Presiona el botón para activar la cámara y escanear el código PDF417 en el reverso de la cédula
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">💡 Instrucciones:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Coloca la cédula con el código PDF417 (reverso) frente a la cámara</li>
            <li>Asegúrate de tener buena iluminación</li>
            <li>Mantén la cédula estable y enfocada</li>
            <li>El código se leerá automáticamente</li>
          </ul>
        </div>

        <Button 
          onClick={handleStartStop}
          variant={isScanning ? 'destructive' : 'default'}
          size="lg"
          className="w-full"
        >
          {isScanning ? (
            <>
              <CameraOff className="mr-2 h-5 w-5" />
              Detener Cámara
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
