import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useControlUsage } from '@/hooks/useSupabaseData';
import { useUsageCounters } from '@/hooks/useUsageCounters';
import { useActiveEventConfig } from '@/hooks/useEventConfig';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const LiveScanMonitor: React.FC = () => {
  const { data: controlUsage = [] } = useControlUsage();
  const { totalUsagesCount, uniqueAttendeesCount, loading } = useUsageCounters();
  const { data: event } = useActiveEventConfig();

  // Get scans from last 5 minutes
  const recentScans = controlUsage.filter(usage => {
    const scanTime = new Date(usage.used_at).getTime();
    const now = Date.now();
    return now - scanTime < 5 * 60 * 1000; // 5 minutes
  });

  // Calculate time since last scan
  const lastScan = controlUsage[0];
  const timeSinceLastScan = lastScan 
    ? formatDistanceToNow(new Date(lastScan.used_at), { locale: es, addSuffix: true })
    : 'Nunca';

  // Check if scanning is active (at least 1 scan in last 5 minutes)
  const isScanningActive = recentScans.length > 0;
  
  // Check if there's a problem (no scans in 15 minutes during active event)
  const timeSinceLastScanMs = lastScan ? Date.now() - new Date(lastScan.used_at).getTime() : Infinity;
  const hasProblem = event?.event_status === 'active' && timeSinceLastScanMs > 15 * 60 * 1000;

  // Scans per minute in last 5 minutes
  const scansPerMinute = recentScans.length / 5;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitoreo en Tiempo Real
            </CardTitle>
            <CardDescription>Estado del sistema de escaneo</CardDescription>
          </div>
          <Badge variant={isScanningActive ? "default" : hasProblem ? "destructive" : "secondary"}>
            {isScanningActive ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Activo
              </>
            ) : hasProblem ? (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Sin Actividad
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                En Espera
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasProblem && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ <strong>ALERTA:</strong> No hay escaneos recientes. Verifica que el scanner esté funcionando.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Escaneos</p>
            <p className="text-2xl font-bold">{loading ? '...' : totalUsagesCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Asistentes Únicos</p>
            <p className="text-2xl font-bold">{loading ? '...' : uniqueAttendeesCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Último Escaneo</p>
            <p className="text-sm font-medium">{timeSinceLastScan}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Ritmo Actual</p>
            <p className="text-sm font-medium">
              {scansPerMinute.toFixed(1)} /min
            </p>
          </div>
        </div>

        {lastScan && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Última Entrada Registrada:</p>
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
              <div>
                <p className="font-medium">{lastScan.attendee?.name || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">
                  {lastScan.control_type?.name || 'N/A'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(lastScan.used_at).toLocaleTimeString('es-ES')}
              </p>
            </div>
          </div>
        )}

        <div className="pt-2">
          <p className="text-xs text-muted-foreground">
            🔄 Actualización automática cada 5 segundos
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveScanMonitor;
