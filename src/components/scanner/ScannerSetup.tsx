import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Wifi, 
  Database,
  Camera,
  QrCode
} from 'lucide-react';
import { useActiveEventConfig } from '@/hooks/useEventConfig';
import { useControlTypes, useProcessQRCode } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

interface SetupCheck {
  id: string;
  label: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  message?: string;
  icon: React.ReactNode;
}

interface ScannerSetupProps {
  onSetupComplete: () => void;
}

const ScannerSetup: React.FC<ScannerSetupProps> = ({ onSetupComplete }) => {
  const { data: event, isLoading: loadingEvent } = useActiveEventConfig();
  const { data: controlTypes, isLoading: loadingControls } = useControlTypes();
  const processQRMutation = useProcessQRCode();
  
  const [checks, setChecks] = useState<SetupCheck[]>([
    { id: 'event', label: 'Evento Activo Configurado', status: 'pending', icon: <Database className="h-4 w-4" /> },
    { id: 'controls', label: 'Tipos de Control Creados', status: 'pending', icon: <QrCode className="h-4 w-4" /> },
    { id: 'internet', label: 'Conexión a Internet', status: 'pending', icon: <Wifi className="h-4 w-4" /> },
    { id: 'database', label: 'Conexión a Base de Datos', status: 'pending', icon: <Database className="h-4 w-4" /> },
    { id: 'camera', label: 'Acceso a Cámara', status: 'pending', icon: <Camera className="h-4 w-4" /> }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [canProceed, setCanProceed] = useState(false);

  const updateCheck = (id: string, updates: Partial<SetupCheck>) => {
    setChecks(prev => prev.map(check => 
      check.id === id ? { ...check, ...updates } : check
    ));
  };

  const runChecks = async () => {
    setIsRunning(true);
    setCanProceed(false);

    // Check 1: Event configured
    updateCheck('event', { status: 'checking' });
    await new Promise(resolve => setTimeout(resolve, 500));
    if (event) {
      updateCheck('event', { 
        status: 'success', 
        message: `Evento: ${event.event_name}` 
      });
    } else {
      updateCheck('event', { 
        status: 'error', 
        message: 'No hay evento activo configurado' 
      });
    }

    // Check 2: Control types exist
    updateCheck('controls', { status: 'checking' });
    await new Promise(resolve => setTimeout(resolve, 500));
    if (controlTypes && controlTypes.length > 0) {
      updateCheck('controls', { 
        status: 'success', 
        message: `${controlTypes.length} tipos de control disponibles` 
      });
    } else {
      updateCheck('controls', { 
        status: 'error', 
        message: 'No hay tipos de control configurados' 
      });
    }

    // Check 3: Internet connection
    updateCheck('internet', { status: 'checking' });
    await new Promise(resolve => setTimeout(resolve, 300));
    if (navigator.onLine) {
      updateCheck('internet', { status: 'success', message: 'Conectado' });
    } else {
      updateCheck('internet', { status: 'error', message: 'Sin conexión a internet' });
    }

    // Check 4: Database connection
    updateCheck('database', { status: 'checking' });
    try {
      const { error } = await supabase.from('event_configs').select('id').limit(1);
      if (error) throw error;
      updateCheck('database', { status: 'success', message: 'Conexión establecida' });
    } catch (error) {
      updateCheck('database', { 
        status: 'error', 
        message: 'Error de conexión a la base de datos' 
      });
    }

    // Check 5: Camera access
    updateCheck('camera', { status: 'checking' });
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      
      if (hasCamera) {
        const permission = await navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            stream.getTracks().forEach(track => track.stop());
            return 'granted';
          })
          .catch(() => 'denied');

        if (permission === 'granted') {
          updateCheck('camera', { status: 'success', message: 'Acceso permitido' });
        } else {
          updateCheck('camera', { 
            status: 'error', 
            message: 'Permisos de cámara denegados' 
          });
        }
      } else {
        updateCheck('camera', { status: 'error', message: 'No se detectó cámara' });
      }
    } catch (error) {
      updateCheck('camera', { 
        status: 'error', 
        message: 'Error al verificar cámara' 
      });
    }

    setIsRunning(false);
  };

  // Auto-run checks on mount
  useEffect(() => {
    if (!loadingEvent && !loadingControls) {
      runChecks();
    }
  }, [loadingEvent, loadingControls]);

  // Check if all critical tests passed
  useEffect(() => {
    const allPassed = checks.every(check => check.status === 'success');
    setCanProceed(allPassed);
  }, [checks]);

  const getStatusIcon = (status: SetupCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'checking':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Verificación Pre-Evento</CardTitle>
        <CardDescription>
          Complete todas las verificaciones antes de iniciar el escaneo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canProceed && !isRunning && (
          <Alert variant="destructive">
            <AlertDescription>
              ⚠️ <strong>NO INICIE EL EVENTO</strong> hasta que todas las verificaciones estén en verde
            </AlertDescription>
          </Alert>
        )}

        {canProceed && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              ✅ Todas las verificaciones pasaron. Sistema listo para operar.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {checks.map(check => (
            <div 
              key={check.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">
                  {check.icon}
                </div>
                <div>
                  <p className="font-medium">{check.label}</p>
                  {check.message && (
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                  )}
                </div>
              </div>
              {getStatusIcon(check.status)}
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={runChecks} 
            disabled={isRunning}
            variant="outline"
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar Nuevamente'
            )}
          </Button>
          
          <Button 
            onClick={onSetupComplete}
            disabled={!canProceed || isRunning}
            className="flex-1"
          >
            Iniciar Escaneo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScannerSetup;
