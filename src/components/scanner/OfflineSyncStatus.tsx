import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface OfflineSyncStatusProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
}

const OfflineSyncStatus: React.FC<OfflineSyncStatusProps> = ({
  isOnline,
  pendingCount,
  isSyncing,
  onSync
}) => {
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <Alert variant={isOnline ? "default" : "destructive"} className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <div>
            <AlertDescription>
              {isOnline ? (
                <>
                  <strong>Modo Online</strong>
                  {pendingCount > 0 && (
                    <span className="ml-2">
                      - {pendingCount} escaneo{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de sincronizar
                    </span>
                  )}
                </>
              ) : (
                <>
                  <strong>Modo Offline</strong>
                  {pendingCount > 0 && (
                    <span className="ml-2">
                      - {pendingCount} escaneo{pendingCount !== 1 ? 's' : ''} guardado{pendingCount !== 1 ? 's' : ''} localmente
                    </span>
                  )}
                </>
              )}
            </AlertDescription>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "secondary"}>
              {pendingCount}
            </Badge>
            {isOnline && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Sincronizar
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {!isOnline && (
        <div className="mt-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          Los escaneos se sincronizarán automáticamente cuando vuelva la conexión
        </div>
      )}
    </Alert>
  );
};

export default OfflineSyncStatus;
