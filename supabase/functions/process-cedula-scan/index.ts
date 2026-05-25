// Edge function: process-cedula-scan
// Batch sync for offline cédula scans with HMAC verification.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isUUID(s: any) {
  return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function verifySignature(
  primaryKey: string,
  controlTypeId: string,
  timestamp: number,
  userId: string,
  signature: string
): Promise<boolean> {
  try {
    const data = `${primaryKey}|${controlTypeId}|${timestamp}|${userId}`;
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(
      `chequi_scan_${userId}_${Math.floor(timestamp / 86400000)}`
    );
    const key = await crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));
  } catch {
    return false;
  }
}

interface ScanItem {
  id: string;
  eventId: string;
  numeroCedula: string;
  controlTypeId: string;
  scannedBy: string;
  timestamp: number;
  signature: string;
  registro: any;
  controlUsage: any;
  accessLog?: any;
  isUnauthorized?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: userErr } = await client.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const scans: ScanItem[] = Array.isArray(body.scans) ? body.scans : [];
    if (scans.length === 0 || scans.length > 200) {
      return new Response(JSON.stringify({ error: "scans must be 1..200 items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const scan of scans) {
      // basic validation
      if (
        !scan.id ||
        !isUUID(scan.eventId) ||
        !isUUID(scan.controlTypeId) ||
        !scan.numeroCedula ||
        typeof scan.timestamp !== "number" ||
        !scan.signature
      ) {
        results.push({ id: scan.id, status: "rejected", error: "invalid_payload" });
        continue;
      }

      // signature must be from current user (prevent replay across users)
      if (scan.scannedBy !== user.id) {
        results.push({ id: scan.id, status: "rejected", error: "scanner_user_mismatch" });
        continue;
      }

      const sigOk = await verifySignature(
        scan.numeroCedula,
        scan.controlTypeId,
        scan.timestamp,
        scan.scannedBy,
        scan.signature
      );
      if (!sigOk) {
        results.push({ id: scan.id, status: "rejected", error: "invalid_signature" });
        continue;
      }

      // event access check
      const { data: canAccess } = await client.rpc("user_can_access_event", {
        check_event_id: scan.eventId,
        check_user_id: user.id,
      });
      if (!canAccess) {
        results.push({ id: scan.id, status: "rejected", error: "no_event_access" });
        continue;
      }

      // 1. Insert registro (upsert on conflict)
      let duplicate = false;
      if (scan.registro) {
        const reg = { ...scan.registro, event_id: scan.eventId, scanned_by: user.id };
        const { error: regErr } = await client
          .from("cedula_registros")
          .upsert(reg, { onConflict: "event_id,numero_cedula" });
        if (regErr) {
          results.push({ id: scan.id, status: "rejected", error: `registro: ${regErr.message}` });
          continue;
        }
      }

      // 2. Insert control usage (skip if unauthorized)
      if (!scan.isUnauthorized && scan.controlUsage) {
        const usage = { ...scan.controlUsage, event_id: scan.eventId, scanned_by: user.id };
        const { error: usageErr } = await client.from("cedula_control_usage").insert(usage);
        if (usageErr) {
          if (usageErr.code === "23505" || usageErr.message?.includes("duplicate")) {
            duplicate = true;
          } else {
            results.push({ id: scan.id, status: "rejected", error: `usage: ${usageErr.message}` });
            continue;
          }
        }
      }

      // 3. Access log (optional)
      if (scan.accessLog) {
        const log = { ...scan.accessLog, event_id: scan.eventId, scanned_by: user.id };
        await client.from("cedula_access_logs").insert(log);
      }

      results.push({ id: scan.id, status: duplicate ? "duplicate_skipped" : "synced" });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-cedula-scan error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
