
import React, { useState, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useControlTypes, useProcessQRCode } from '@/hooks/useSupabaseData';
import { Ticket, Utensils, Wine, Crown } from 'lucide-react';

const QRScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [selectedControlType, setSelectedControlType] = useState<string>('');
  const [lastResult, setLastResult] = useState<null | { 
    success: boolean; 
    attendee?: any;
    usageCount?: number;
    controlType?: string;
  }>(null);

  const { data: controlTypes, isLoading: loadingControlTypes } = useControlTypes();
  const processQRMutation = useProcessQRCode();

  // Set default control type to "ingreso"
  useEffect(() => {
    if (controlTypes && controlTypes.length > 0 && !selectedControlType) {
      const ingresoControl = controlTypes.find(ct => ct.name === 'ingreso');
      if (ingresoControl) {
        setSelectedControlType(ingresoControl.id);
      }
    }
  }, [controlTypes, selectedControlType]);

  const getControlIcon = (iconName: string | null) => {
    switch (iconName) {
      case 'ticket': return <Ticket className="w-6 h-6" />;
      case 'utensils': return <Utensils className="w-6 h-6" />;
      case 'wine': return <Wine className="w-6 h-6" />;
      case 'crown': return <Crown className="w-6 h-6" />;
      default: return <Ticket className="w-6 h-6" />;
    }
  };

  const startScanning = () => {
    if (!selectedControlType) {
      toast.error('Por favor selecciona un tipo de control');
      return;
    }

    setScanning(true);
    
    // Simular escaneo - en producción esto sería con una librería de QR
    setTimeout(() => {
      simulateScan();
    }, 2000);
  };

  const simulateScan = () => {
    // Lista de tickets disponibles para demo
    const availableTickets = [
      'CLIENT-3A9B-2024',
      'CLIENT-7C2D-2024', 
      'CLIENT-1F5G-2024',
      'CLIENT-8H3J-2024',
      'CLIENT-5K9L-2024'
    ];
    
    const randomTicket = availableTickets[Math.floor(Math.random() * availableTickets.length)];
    processQRCode(randomTicket);
  };

  const processQRCode = async (ticketId: string) => {
    try {
      const result = await processQRMutation.mutateAsync({
        ticketId,
        controlType: selectedControlType
      });

      const selectedControl = controlTypes?.find(ct => ct.id === selectedControlType);
      
      setLastResult({ 
        success: true, 
        attendee: result.attendee,
        usageCount: result.usageCount,
        controlType: selectedControl?.name 
      });
      
      toast.success('Control registrado exitosamente', {
        description: `${selectedControl?.description} - ${result.attendee.name}`
      });
    } catch (error: any) {
      setLastResult({ success: false });
      toast.error('Error al procesar el código QR', {
        description: error.message
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
      }, 4000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [lastResult]);

  if (loadingControlTypes) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="text-hueso">Cargando tipos de control...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tipo de Control
        </label>
        <Select value={selectedControlType} onValueChange={setSelectedControlType}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-hueso">
            <SelectValue placeholder="Selecciona el tipo de control" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {controlTypes?.map((controlType) => (
              <SelectItem key={controlType.id} value={controlType.id} className="text-hueso">
                <div className="flex items-center gap-2">
                  {getControlIcon(controlType.icon)}
                  <span className="capitalize">{controlType.name}</span>
                  <span className="text-xs text-gray-400">- {controlType.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-80 h-80 scan-border rounded-md mb-6">
        {scanning && <div className="scan-line"></div>}
        <div className="flex flex-col items-center justify-center h-full">
          {!scanning && !lastResult && (
            <>
              <div className="text-center mb-4">
                <p className="text-lg font-medium">Acerque su código QR al marco</p>
                <p className="text-sm text-gray-400">Coloque el código QR dentro del área marcada</p>
                {selectedControlType && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-dorado">
                    {getControlIcon(controlTypes?.find(ct => ct.id === selectedControlType)?.icon || null)}
                    <span className="capitalize">
                      {controlTypes?.find(ct => ct.id === selectedControlType)?.name}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
          
          {scanning && (
            <div className="text-center">
              <p className="text-lg font-medium animate-pulse">Escaneando...</p>
              <p className="text-sm text-gray-400 mt-2">
                Control: {controlTypes?.find(ct => ct.id === selectedControlType)?.name}
              </p>
            </div>
          )}
          
          {lastResult && (
            <div className={`text-center p-4 rounded-lg ${lastResult.success ? 'bg-green-800/20' : 'bg-red-800/20'}`}>
              <div className={`text-5xl mb-2 ${lastResult.success ? 'text-green-500' : 'text-red-500'}`}>
                {lastResult.success ? '✓' : '✗'}
              </div>
              <p className="text-lg font-medium">
                {lastResult.success ? 'Control Registrado' : 'Control Denegado'}
              </p>
              {lastResult.attendee && (
                <>
                  <p className="text-sm mt-1">
                    {lastResult.attendee.name} - {lastResult.attendee.company}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {lastResult.controlType} - Uso #{lastResult.usageCount}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {!scanning && !lastResult && (
        <Button
          className="px-6 py-3 bg-dorado text-empresarial font-semibold hover:bg-dorado/90 disabled:opacity-50"
          onClick={startScanning}
          disabled={!selectedControlType || processQRMutation.isPending}
        >
          Iniciar Escaneo
        </Button>
      )}
      
      {scanning && (
        <Button
          className="px-6 py-3 bg-red-600 text-white font-semibold hover:bg-red-700"
          onClick={() => setScanning(false)}
        >
          Cancelar Escaneo
        </Button>
      )}
    </div>
  );
};

export default QRScanner;
