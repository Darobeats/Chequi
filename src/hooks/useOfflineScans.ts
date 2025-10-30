import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface PendingScan {
  id: string;
  ticketId: string;
  controlTypeId: string;
  eventId: string;
  device: string;
  timestamp: number;
  retryCount: number;
}

const STORAGE_KEY = 'pending_scans';
const MAX_RETRIES = 5;

export const useOfflineScans = () => {
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  // Load pending scans from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPendingScans(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading pending scans:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save to localStorage whenever pendingScans changes
  useEffect(() => {
    if (pendingScans.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingScans));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [pendingScans]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info('Conexión restaurada', {
        description: 'Sincronizando escaneos pendientes...'
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sin conexión', {
        description: 'Los escaneos se guardarán localmente'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingScans.length > 0 && !isSyncing) {
      syncPendingScans();
    }
  }, [isOnline, pendingScans.length]);

  const addPendingScan = useCallback((scan: Omit<PendingScan, 'id' | 'timestamp' | 'retryCount'>) => {
    const newScan: PendingScan = {
      ...scan,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0
    };

    setPendingScans(prev => [...prev, newScan]);
    
    toast.info('Escaneo guardado localmente', {
      description: 'Se sincronizará cuando haya conexión'
    });
  }, []);

  const syncPendingScans = useCallback(async () => {
    if (isSyncing || pendingScans.length === 0) return;

    setIsSyncing(true);
    const successfulIds: string[] = [];
    const failedScans: PendingScan[] = [];

    for (const scan of pendingScans) {
      try {
        const { error } = await supabase.functions.invoke('process-qr-scan', {
          body: {
            ticketId: scan.ticketId,
            controlTypeId: scan.controlTypeId,
            eventId: scan.eventId,
            device: `${scan.device} (Sincronizado)`
          }
        });

        if (error) throw error;
        
        successfulIds.push(scan.id);
        console.log('✅ Scan synced:', scan.ticketId);
      } catch (error) {
        console.error('❌ Failed to sync scan:', error);
        
        if (scan.retryCount < MAX_RETRIES) {
          failedScans.push({
            ...scan,
            retryCount: scan.retryCount + 1
          });
        } else {
          toast.error('Escaneo descartado', {
            description: `${scan.ticketId} - Demasiados reintentos`
          });
        }
      }
    }

    // Update pending scans
    setPendingScans(failedScans);

    if (successfulIds.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['control_usage'] });
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
      
      toast.success('Escaneos sincronizados', {
        description: `${successfulIds.length} escaneos guardados en el servidor`
      });
    }

    setIsSyncing(false);
  }, [pendingScans, isSyncing, queryClient]);

  return {
    pendingScans,
    addPendingScan,
    syncPendingScans,
    isSyncing,
    isOnline,
    hasPendingScans: pendingScans.length > 0
  };
};
