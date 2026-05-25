import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  putWhitelistEntries,
  putAttendees,
  putControlTypes,
  putCategoryControls,
  putEventConfig,
  putMeta,
  getMeta,
  type CachedWhitelistEntry,
  type CachedAttendee,
  type CachedControlType,
  type CachedCategoryControl,
  type OfflineMeta,
} from "@/lib/offlineDB";

const PAGE_SIZE = 1000;

async function fetchAllPaginated<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await fetchPage(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

export interface PrechargeProgress {
  step: string;
  current: number;
  total: number;
}

export interface PrechargeResult {
  whitelistCount: number;
  attendeesCount: number;
  controlTypesCount: number;
  categoryControlsCount: number;
}

export function useOfflinePrecharge(eventId: string | null) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<PrechargeProgress | null>(null);
  const [lastMeta, setLastMeta] = useState<OfflineMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshMeta = useCallback(async () => {
    if (!eventId) return;
    const meta = await getMeta(eventId);
    setLastMeta(meta);
  }, [eventId]);

  const run = useCallback(async (): Promise<PrechargeResult | null> => {
    if (!eventId) {
      setError("No hay evento seleccionado");
      return null;
    }
    setIsRunning(true);
    setError(null);
    try {
      // 1. Whitelist
      setProgress({ step: "Descargando lista de autorizados", current: 0, total: 1 });
      const whitelist = await fetchAllPaginated<CachedWhitelistEntry>((from, to) =>
        supabase
          .from("cedulas_autorizadas")
          .select("id,event_id,numero_cedula,nombre_completo,categoria,empresa,notas")
          .eq("event_id", eventId)
          .range(from, to) as any
      );
      await putWhitelistEntries(eventId, whitelist);
      setProgress({ step: "Lista de autorizados", current: whitelist.length, total: whitelist.length });

      // 2. Attendees
      setProgress({ step: "Descargando asistentes (QR)", current: 0, total: 1 });
      const attendees = await fetchAllPaginated<CachedAttendee>((from, to) =>
        supabase
          .from("attendees")
          .select("id,event_id,ticket_id,qr_code,name,category_id,status")
          .eq("event_id", eventId)
          .range(from, to) as any
      );
      await putAttendees(eventId, attendees);
      setProgress({ step: "Asistentes", current: attendees.length, total: attendees.length });

      // 3. Control types
      setProgress({ step: "Descargando tipos de control", current: 0, total: 1 });
      const controlTypes = await fetchAllPaginated<CachedControlType>((from, to) =>
        supabase
          .from("control_types")
          .select("id,event_id,name,description,color,icon,requires_control_id")
          .eq("event_id", eventId)
          .range(from, to) as any
      );
      await putControlTypes(eventId, controlTypes);

      // 4. Category controls (limits)
      const categoryIds = Array.from(new Set(attendees.map((a) => a.category_id).filter(Boolean)));
      let categoryControls: CachedCategoryControl[] = [];
      if (categoryIds.length > 0) {
        const { data, error: ccErr } = await supabase
          .from("category_controls")
          .select("id,category_id,control_type_id,max_uses")
          .in("category_id", categoryIds);
        if (ccErr) throw ccErr;
        categoryControls = (data ?? []) as CachedCategoryControl[];
        await putCategoryControls(categoryControls);
      }

      // 5. Event config
      const { data: cfg, error: cfgErr } = await supabase
        .from("event_configs")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (cfgErr) throw cfgErr;
      if (cfg) await putEventConfig(cfg as any);

      // 6. Meta
      const meta: OfflineMeta = {
        eventId,
        lastSyncAt: Date.now(),
        whitelistCount: whitelist.length,
        attendeesCount: attendees.length,
        controlTypesCount: controlTypes.length,
      };
      await putMeta(meta);
      setLastMeta(meta);
      setProgress(null);

      return {
        whitelistCount: whitelist.length,
        attendeesCount: attendees.length,
        controlTypesCount: controlTypes.length,
        categoryControlsCount: categoryControls.length,
      };
    } catch (e: any) {
      console.error("[Precharge] failed:", e);
      setError(e?.message ?? "Error al precargar datos");
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [eventId]);

  return { run, isRunning, progress, lastMeta, refreshMeta, error };
}
