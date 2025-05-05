
import React, { useState, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import { mockAttendees } from '@/utils/mockData';

const QRScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<null | { success: boolean; attendee?: any }>(null);

  // Mock QR scanning functionality
  // In a real app, this would use react-qr-scanner or a similar library
  const startScanning = () => {
    setScanning(true);
    
    // For demo purposes, let's simulate scanning after a delay
    setTimeout(() => {
      simulateScan();
    }, 2000);
  };

  const simulateScan = () => {
    // Randomly select valid or invalid QR code for demo
    const randomIndex = Math.floor(Math.random() * mockAttendees.length);
    const scannedAttendee = mockAttendees[randomIndex];
    
    processQRCode(scannedAttendee.ticketID);
  };

  const processQRCode = (code: string) => {
    // Find the attendee with the matching ticket ID
    const attendee = mockAttendees.find(a => a.ticketID === code);
    
    if (!attendee) {
      setLastResult({ success: false });
      toast.error('QR inválido', {
        description: 'El código QR no corresponde a ningún ticket registrado.'
      });
      return;
    }
    
    if (attendee.status === 'used') {
      setLastResult({ success: false, attendee });
      toast.error('Acceso denegado', {
        description: 'Este ticket ya ha sido utilizado.'
      });
    } else {
      // In a real app, we would update the database here
      setLastResult({ success: true, attendee });
      toast.success('Acceso concedido', {
        description: `Bienvenido, ${attendee.nombre}`
      });
    }
    
    setScanning(false);
  };

  // Reset the scanner after showing the result
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (lastResult) {
      timer = setTimeout(() => {
        setLastResult(null);
      }, 3000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [lastResult]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-80 h-80 scan-border rounded-md mb-6">
        {scanning && <div className="scan-line"></div>}
        <div className="flex flex-col items-center justify-center h-full">
          {!scanning && !lastResult && (
            <>
              <div className="text-center mb-4">
                <p className="text-lg font-medium">Acerque su código QR al marco</p>
                <p className="text-sm text-gray-400">Coloque el código QR dentro del área marcada</p>
              </div>
            </>
          )}
          
          {scanning && (
            <div className="text-center">
              <p className="text-lg font-medium animate-pulse">Escaneando...</p>
            </div>
          )}
          
          {lastResult && (
            <div className={`text-center p-4 rounded-lg ${lastResult.success ? 'bg-green-800/20' : 'bg-red-800/20'}`}>
              <div className={`text-5xl mb-2 ${lastResult.success ? 'text-green-500' : 'text-red-500'}`}>
                {lastResult.success ? '✓' : '✗'}
              </div>
              <p className="text-lg font-medium">
                {lastResult.success ? 'Acceso Concedido' : 'Acceso Denegado'}
              </p>
              {lastResult.attendee && (
                <p className="text-sm">
                  {lastResult.attendee.nombre} - {lastResult.attendee.empresa}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {!scanning && !lastResult && (
        <button
          className="px-6 py-3 bg-dorado text-empresarial font-semibold rounded-md hover:bg-dorado/90 transition-colors"
          onClick={startScanning}
        >
          Iniciar Escaneo
        </button>
      )}
      
      {scanning && (
        <button
          className="px-6 py-3 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
          onClick={() => setScanning(false)}
        >
          Cancelar Escaneo
        </button>
      )}
    </div>
  );
};

export default QRScanner;
