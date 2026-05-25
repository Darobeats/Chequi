import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { countLocalCedulaUsage } from "@/lib/offlineDB";
import type { ControlLimitResult } from "@/hooks/useCedulaControlUsage";

/**
 * Offline-aware control limit check.
 * Online → real DB count via RPC.
 * Offline → local IndexedDB count from localCedulaUsage store. Default max = 1.
 */
export function useOfflineControlLimit(eventId: string | null) {
  return useCallback(
    async (numeroCedula: string, controlTypeId: string): Promise<ControlLimitResult> => {
      if (!eventId) {
        return {
          can_access: false,
          current_uses: 0,
          max_uses: 0,
          error_message: "Evento no seleccionado",
        };
      }

      if (navigator.onLine) {
        try {
          const { count } = await supabase
            .from("cedula_control_usage")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventId)
            .eq("numero_cedula", numeroCedula)
            .eq("control_type_id", controlTypeId);

          const localCount = await countLocalCedulaUsage(eventId, numeroCedula, controlTypeId);
          const currentUses = Math.max(count ?? 0, localCount);

          const { data } = await supabase.rpc("check_cedula_control_limit", {
            p_event_id: eventId,
            p_numero_cedula: numeroCedula,
            p_control_type_id: controlTypeId,
          });
          let maxUses = 1;
          if (data && data.length > 0 && data[0].max_uses > 0) {
            maxUses = data[0].max_uses;
          }
          if (currentUses >= maxUses) {
            return {
              can_access: false,
              current_uses: currentUses,
              max_uses: maxUses,
              error_message: `LÍMITE ALCANZADO (${currentUses}/${maxUses})`,
            };
          }
          return {
            can_access: true,
            current_uses: currentUses,
            max_uses: maxUses,
            error_message: `Acceso permitido (${currentUses}/${maxUses})`,
          };
        } catch (err) {
          // fall through to offline path
          console.warn("[OfflineLimit] online check failed, using local cache", err);
        }
      }

      const localCount = await countLocalCedulaUsage(eventId, numeroCedula, controlTypeId);
      const maxUses = 1; // sensible default offline; configurable per-category requires precharge
      if (localCount >= maxUses) {
        return {
          can_access: false,
          current_uses: localCount,
          max_uses: maxUses,
          error_message: `LÍMITE ALCANZADO OFFLINE (${localCount}/${maxUses})`,
        };
      }
      return {
        can_access: true,
        current_uses: localCount,
        max_uses: maxUses,
        error_message: `Acceso permitido offline (${localCount}/${maxUses})`,
      };
    },
    [eventId]
  );
}
