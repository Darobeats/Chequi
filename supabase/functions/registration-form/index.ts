// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const uuid = z.string().uuid();

async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function loadForm(eventId: string) {
  const { data } = await admin.from("event_registration_forms")
    .select("event_id,is_enabled,title,welcome_message,success_message,fields,dedupe_keys")
    .eq("event_id", eventId).maybeSingle();
  if (!data || !data.is_enabled) return null;
  const { data: ev } = await admin.from("event_configs")
    .select("event_name,logo_url,primary_color,background_url").eq("id", eventId).maybeSingle();
  return { form: data, event: ev };
}

function validator(f: any) {
  let s: z.ZodTypeAny;
  switch (f.type) {
    case "email": s = z.string().trim().toLowerCase().email("Correo inválido").max(255); break;
    case "tel": s = z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "Celular inválido"); break;
    case "cedula": s = z.string().trim().regex(/^[0-9A-Za-z.\-\s]{4,20}$/, "Cédula inválida"); break;
    case "number": s = z.string().trim().regex(/^-?[0-9]+([.,][0-9]+)?$/, "Número inválido").max(30); break;
    case "date": s = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"); break;
    case "select": s = z.string().trim().refine((v) => (f.options ?? []).includes(v), "Opción inválida"); break;
    default: s = z.string().trim().max(200, "Máximo 200 caracteres");
  }
  return f.required ? s.refine((v: string) => v.length > 0, "Obligatorio") : z.union([z.literal(""), s]).optional();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method === "GET") {
      const id = uuid.safeParse(new URL(req.url).searchParams.get("event_id"));
      if (!id.success) return json({ error: "Evento inválido" }, 400);
      const r = await loadForm(id.data);
      return r ? json(r) : json({ error: "Formulario no disponible" }, 404);
    }
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

    const body = z.object({
      event_id: uuid,
      data: z.record(z.string().max(2000)),
      consent: z.literal(true),
      consent_version: z.string().min(1).max(40),
    }).safeParse(await req.json().catch(() => null));
    if (!body.success) return json({ error: "Datos inválidos o falta el consentimiento" }, 400);

    const r = await loadForm(body.data.event_id);
    if (!r) return json({ error: "Formulario no disponible" }, 404);
    const fields: any[] = Array.isArray(r.form.fields) ? r.form.fields : [];

    const shape: Record<string, z.ZodTypeAny> = {};
    for (const f of fields) shape[f.key] = validator(f);
    const parsed = z.object(shape).safeParse(body.data.data);
    if (!parsed.success) return json({ error: "Revisa los campos", fields: parsed.error.flatten().fieldErrors }, 400);
    const clean: Record<string, string> = {};
    for (const f of fields) {
      let v = (parsed.data as any)[f.key] ?? "";
      if (f.type === "cedula") v = String(v).replace(/[^0-9A-Za-z]/g, "").toUpperCase();
      if (v !== "") clean[f.key] = v;
    }

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const ipHash = ip ? await sha(ip) : null;
    if (ipHash) {
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const { count } = await admin.from("event_form_submissions").select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash).gte("created_at", since);
      if ((count ?? 0) >= 30) return json({ error: "Demasiados intentos, intenta en unos minutos" }, 429);
    }

    const dedupeKeys: string[] = r.form.dedupe_keys ?? [];
    const dedupeFields = fields.filter((f) => dedupeKeys.includes(f.type) || dedupeKeys.includes(f.key));
    for (const f of dedupeFields) {
      const v = clean[f.key];
      if (!v) continue;
      const { count } = await admin.from("event_form_submissions").select("id", { count: "exact", head: true })
        .eq("event_id", body.data.event_id).eq(`data->>${f.key}`, v);
      if ((count ?? 0) > 0) return json({ error: "Ya estás registrado", duplicate: true }, 409);
    }
    const dedupeValue = dedupeFields.map((f) => clean[f.key]).filter(Boolean).join("|") || null;

    const { error } = await admin.from("event_form_submissions").insert({
      event_id: body.data.event_id, data: clean, dedupe_value: dedupeValue,
      consent_version: body.data.consent_version,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300), ip_hash: ipHash,
    });
    if (error) {
      if (error.code === "23505") return json({ error: "Ya estás registrado", duplicate: true }, 409);
      throw error;
    }
    return json({ ok: true, message: r.form.success_message || "Registro recibido" });
  } catch (e) {
    console.error("[registration-form]", e);
    return json({ error: "Error interno" }, 500);
  }
});
