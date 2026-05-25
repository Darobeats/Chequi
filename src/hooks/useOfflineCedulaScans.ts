import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  enqueuePendingCedulaScan,
  listPendingCedulaScans,
  deletePendingCedulaScan,
  updatePendingCedulaScan,
  recordLocalCedulaUsage,
  type PendingCedulaScan,
} from "@/lib/offlineDB";
import { generateScanSignature } from "@/lib/scanSignature";

const MAX_RETRIES = 5;
const BATCH_SIZE = 50;

interface EnqueueArgs {
  eventId: string;
  numeroCedula: string;
  controlTypeId: string;
  scannedBy: string;
  registro: any;
  controlUsage: any;
  accessLog?: any;
  isUnauthorized?: boolean;
}

export function useOfflineCedulaScans() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingCedulaScan[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const refresh = useCallback(async () => {
    setPending(await listPendingCedulaScans());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const enqueue = useCallback(
    async (args: EnqueueArgs) => {
      const timestamp = Date.now();
      const signature = await generateScanSignature(
        args.numeroCedula,
        args.controlTypeId,
        timestamp,
        args.scannedBy
      );
      const scan: PendingCedulaScan = {
        id: crypto.randomUUID(),
        eventId: args.eventId,
        numeroCedula: args.numeroCedula,
        controlTypeId: args.controlTypeId,
        scannedBy: args.scannedBy,
        timestamp,
        signature,
        retryCount: 0,
        status: "queued",
        payload: {
          registro: args.registro,
          controlUsage: args.controlUsage,
          accessLog: args.accessLog,
          isUnauthorized: args.isUnauthorized,
        },
      };
      await enqueuePendingCedulaScan(scan);
      // record local usage so duplicate detection works while still offline
      if (!args.isUnauthorized) {
        await recordLocalCedulaUsage({
          eventId: args.eventId,
          numeroCedula: args.numeroCedula,
          controlTypeId: args.controlTypeId,
          timestamp,
        });
      }
      await refresh();
      return scan;
    },
    [refresh]
  );

  const sync = useCallback(async () => {
    if (isSyncing) return;
    const queue = await listPendingCedulaScans();
    if (queue.length === 0) return;
    if (!navigator.onLine) return;

    setIsSyncing(true);
    let synced = 0;
    let duplicates = 0;
    let failed = 0;

    try {
      for (let i = 0; i < queue.length; i += BATCH_SIZE) {
        const batch = queue.slice(i, i + BATCH_SIZE);
        const payload = batch.map((s) => ({
          id: s.id,
          eventId: s.eventId,
          numeroCedula: s.numeroCedula,
          controlTypeId: s.controlTypeId,
          scannedBy: s.scannedBy,
          timestamp: s.timestamp,
          signature: s.signature,
          registro: s.payload.registro,
          controlUsage: s.payload.controlUsage,
          accessLog: s.payload.accessLog,
          isUnauthorized: !!s.payload.isUnauthorized,
        }));

        const { data, error } = await supabase.functions.invoke("process-cedula-scan", {
          body: { scans: payload },
        });

        if (error || !data) {
          // Whole batch failed → bump retry counters
          for (const s of batch) {
            if (s.retryCount >= MAX_RETRIES) {
              await deletePendingCedulaScan(s.id);
              failed++;
            } else {
              await updatePendingCedulaScan({
                ...s,
                retryCount: s.retryCount + 1,
                status: "failed",
                lastError: error?.message ?? "sync_failed",
              });
            }
          }
          continue;
        }

        const results: Array<{ id: string; status: string; error?: string }> = data.results ?? [];
        for (const r of results) {
          const original = batch.find((b) => b.id === r.id);
          if (!original) continue;
          if (r.status === "synced" || r.status === "duplicate_skipped") {
            await deletePendingCedulaScan(original.id);
            if (r.status === "synced") synced++;
            else duplicates++;
          } else {
            if (original.retryCount >= MAX_RETRIES) {
              await deletePendingCedulaScan(original.id);
              failed++;
            } else {
              await updatePendingCedulaScan({
                ...original,
                retryCount: original.retryCount + 1,
                status: "failed",
                lastError: r.error,
              });
            }
          }
        }
      }

      if (synced > 0 || duplicates > 0) {
        queryClient.invalidateQueries({ queryKey: ["cedula_registros"] });
        queryClient.invalidateQueries({ queryKey: ["cedulaControlUsage"] });
        queryClient.invalidateQueries({ queryKey: ["cedula_access_logs"] });
        queryClient.invalidateQueries({ queryKey: ["cedula_stats"] });
        toast.success(`Sincronización completa`, {
          description: `${synced} guardados · ${duplicates} duplicados omitidos${failed ? ` · ${failed} descartados` : ""}`,
        });
      } else if (failed > 0) {
        toast.error(`${failed} escaneos descartados tras varios reintentos`);
      }
    } finally {
      setIsSyncing(false);
      await refresh();
    }
  }, [isSyncing, queryClient, refresh]);

  // Auto-sync when back online and queue is non-empty
  useEffect(() => {
    if (isOnline && pending.length > 0 && !isSyncing) {
      void sync();
    }
  }, [isOnline, pending.length, isSyncing, sync]);

  return {
    pending,
    isSyncing,
    isOnline,
    enqueue,
    sync,
    hasPending: pending.length > 0,
  };
}
