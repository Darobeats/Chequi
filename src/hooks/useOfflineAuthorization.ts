import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { findWhitelistEntry, type CachedWhitelistEntry } from "@/lib/offlineDB";
import type { CedulaAutorizada } from "@/types/cedula";

/**
 * Offline-aware whitelist check.
 * Online → consult Supabase (authoritative).
 * Offline → consult IndexedDB cache populated by precharge.
 */
export function useOfflineAuthorization(eventId: string | null) {
  return useCallback(
    async (numeroCedula: string): Promise<CedulaAutorizada | null> => {
      if (!eventId) return null;

      if (navigator.onLine) {
        const { data, error } = await supabase
          .from("cedulas_autorizadas")
          .select("*")
          .eq("event_id", eventId)
          .eq("numero_cedula", numeroCedula)
          .maybeSingle();
        if (error) {
          // Network failure mid-request → fall back to cache
          const cached = await findWhitelistEntry(eventId, numeroCedula);
          return cached ? (cached as unknown as CedulaAutorizada) : null;
        }
        return (data as CedulaAutorizada) ?? null;
      }

      const cached = await findWhitelistEntry(eventId, numeroCedula);
      return cached ? (cached as unknown as CedulaAutorizada) : null;
    },
    [eventId]
  );
}

export type { CachedWhitelistEntry };
