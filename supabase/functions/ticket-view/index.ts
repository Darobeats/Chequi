// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{36}$/.test(token)) return json({ error: "Enlace inválido" }, 400);
  const { data: r } = await admin.from("email_campaign_recipients")
    .select("ticket_url,event_id, attendees(name,qr_code,ticket_id,status, ticket_categories(name))")
    .eq("view_token", token).maybeSingle();
  if (!r) return json({ error: "Boleta no encontrada" }, 404);
  const { data: ev } = await admin.from("event_configs")
    .select("event_name,logo_url,event_start_date,event_date").eq("id", r.event_id).maybeSingle();
  const a: any = r.attendees;
  return json({
    name: a?.name, category: a?.ticket_categories?.name ?? null, status: a?.status,
    qr: a?.qr_code || a?.ticket_id, ticket_url: r.ticket_url,
    event_name: ev?.event_name, logo_url: ev?.logo_url, date: ev?.event_start_date ?? ev?.event_date,
  });
});
