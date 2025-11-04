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
  signature: string; // Cryptographic signature for integrity
  userId: string; // User who performed the scan
}

const STORAGE_KEY = 'pending_scans';
const MAX_RETRIES = 5;

// Generate HMAC-SHA256 signature for scan integrity
async function generateScanSignature(
  ticketId: string,
  controlTypeId: string,
  timestamp: number,
  userId: string
): Promise<string> {
  const data = `${ticketId}|${controlTypeId}|${timestamp}|${userId}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Use a combination of user ID and timestamp as key material
  const keyMaterial = encoder.encode(`chequi_scan_${userId}_${Math.floor(timestamp / 86400000)}`);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

  const addPendingScan = useCallback(async (scan: Omit<PendingScan, 'id' | 'timestamp' | 'retryCount' | 'signature' | 'userId'>) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const timestamp = Date.now();
      const signature = await generateScanSignature(
        scan.ticketId,
        scan.controlTypeId,
        timestamp,
        user.id
      );

      const newScan: PendingScan = {
        ...scan,
        id: crypto.randomUUID(),
        timestamp,
        retryCount: 0,
        signature,
        userId: user.id,
      };

      setPendingScans(prev => [...prev, newScan]);
      
      toast.info('Escaneo guardado localmente', {
        description: 'Se sincronizará cuando haya conexión'
      });

      return newScan;
    } catch (error) {
      console.error('Error adding pending scan:', error);
      toast.error('Error al guardar escaneo offline');
      throw error;
    }
  }, []);

  const syncPendingScans = useCallback(async () => {
    if (isSyncing || pendingScans.length === 0) return;

    setIsSyncing(true);
    const successfulIds: string[] = [];
    const failedScans: PendingScan[] = [];

    for (const scan of pendingScans) {
      try {
        const { error, data } = await supabase.functions.invoke('process-qr-scan', {
          body: {
            ticketId: scan.ticketId,
            controlTypeId: scan.controlTypeId,
            eventId: scan.eventId,
            device: `${scan.device} (Offline Sync)`,
            timestamp: scan.timestamp,
            signature: scan.signature,
            userId: scan.userId,
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.message || 'Error desconocido');
        
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
