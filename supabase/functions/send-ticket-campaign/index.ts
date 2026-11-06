// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "contacto@ticket.chequi.online";
const REPLY_TO = "contacto@chequi.online";
const SITE_URL = "https://chequi.online";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function fill(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(nombre|evento|fecha|categoria)\}/g, (_, k) => vars[k] ?? "");
}

function formatDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(`${d}T12:00:00-05:00`);
  return dt.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" });
}

function buildHtml(o: {
  subject: string; greeting: string; body: string; eventName: string; logo?: string | null;
  ticketUrl?: string | null; viewUrl: string; name: string; category: string; dateText: string;
}) {
  const paragraphs = esc(o.body).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.55">${p.replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#0A0A0A">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td align="center" style="padding-bottom:18px">${o.logo ? `<img src="${esc(o.logo)}" alt="${esc(o.eventName)}" style="max-height:70px;max-width:220px">` : `<strong style="font-size:20px">${esc(o.eventName)}</strong>`}</td></tr>
<tr><td style="font-size:15px">
<p style="margin:0 0 14px;font-size:18px;font-weight:bold">${esc(o.greeting)}</p>
${paragraphs}
<p style="margin:0 0 6px"><strong>Evento:</strong> ${esc(o.eventName)}${o.dateText ? ` — ${esc(o.dateText)}` : ""}</p>
${o.category ? `<p style="margin:0 0 16px"><strong>Categoría:</strong> ${esc(o.category)}</p>` : ""}
</td></tr>
${o.ticketUrl ? `<tr><td align="center" style="padding:10px 0"><img src="${esc(o.ticketUrl)}" alt="Boleta de ${esc(o.name)}" style="width:100%;max-width:520px;border:1px solid #eee;border-radius:8px"></td></tr>` : ""}
<tr><td align="center" style="padding:18px 0">
<a href="${esc(o.viewUrl)}" style="display:inline-block;background:#E0B52F;color:#0A0A0A;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:8px">Ver mi boleta</a>
<p style="font-size:12px;color:#666;margin:12px 0 0">Presenta el código QR en la entrada desde tu celular o impreso. No lo compartas.</p>
</td></tr>
<tr><td style="border-top:1px solid #eee;padding-top:14px;font-size:11px;color:#888;line-height:1.5">
Recibes este correo porque estás registrado en ${esc(o.eventName)}. El organizador del evento es el responsable del tratamiento de tus datos y Chequi actúa como encargado.
Consulta el <a href="${SITE_URL}/legal/aviso" style="color:#888">aviso de privacidad</a>. Dudas: ${REPLY_TO}.
</td></tr></table></td></tr></table></body></html>`;
}

async function resend(path: string, payload: unknown) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": Deno.env.get("RESEND_API_KEY")!,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* keep text */ }
  return { ok: res.ok, status: res.status, data, text };
}

const Body = z.object({
  campaign_id: z.string().uuid(),
  recipient_ids: z.array(z.string().uuid()).max(50).optional(),
  test_email: z.string().trim().toLowerCase().regex(EMAIL_RE).max(255).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
    if (!Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("RESEND_API_KEY")) return json({ error: "Servicio de correo no configurado" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(auth.slice(7));
    if (claimsErr || !claims?.claims?.sub) return json({ error: "No autorizado" }, 401);
    const userId = claims.claims.sub as string;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, 400);
    const { campaign_id, recipient_ids, test_email } = parsed.data;

    const { data: campaign } = await admin.from("email_campaigns").select("*").eq("id", campaign_id).maybeSingle();
    if (!campaign) return json({ error: "Campaña no encontrada" }, 404);

    const [{ data: manage }, { data: isAdmin }, { data: access }] = await Promise.all([
      admin.rpc("can_manage_event_team", { check_event_id: campaign.event_id, check_user_id: userId }),
      admin.rpc("can_modify_data", { check_user_id: userId }),
      admin.rpc("user_can_access_event", { check_event_id: campaign.event_id, check_user_id: userId }),
    ]);
    if (!(manage || (isAdmin && access))) return json({ error: "Solo administradores del evento pueden enviar" }, 403);

    const { data: ev } = await admin.from("event_configs")
      .select("event_name,logo_url,event_start_date,event_date").eq("id", campaign.event_id).maybeSingle();
    const eventName = ev?.event_name ?? "Evento";
    const dateText = formatDate(ev?.event_start_date ?? ev?.event_date);
    const fromName = eventName.replace(/[<>"\r\n,]/g, "").slice(0, 60) || "Chequi";

    let q = admin.from("email_campaign_recipients")
      .select("id,email,attendee_id,ticket_url,view_token,status,attempts, attendees(name, ticket_categories(name))")
      .eq("campaign_id", campaign_id);
    if (recipient_ids?.length) q = q.in("id", recipient_ids);
    else q = q.in("status", ["pending", "failed"]).limit(test_email ? 1 : 50);
    const { data: recipients, error: rErr } = await q;
    if (rErr) return json({ error: rErr.message }, 500);
    if (!recipients?.length) return json({ sent: 0, failed: 0, results: [] });

    const list = test_email ? recipients.slice(0, 1) : recipients;
    const emails = list.map((r: any) => {
      const name = r.attendees?.name ?? "";
      const category = r.attendees?.ticket_categories?.name ?? "";
      const vars = { nombre: name, evento: eventName, fecha: dateText, categoria: category };
      const subject = fill(campaign.subject, vars).slice(0, 200);
      return {
        r,
        payload: {
          from: `${fromName} <${FROM_EMAIL}>`,
          to: [test_email ?? r.email],
          reply_to: REPLY_TO,
          subject: test_email ? `[PRUEBA] ${subject}` : subject,
          html: buildHtml({
            subject, greeting: fill(campaign.greeting || "Hola {nombre},", vars),
            body: fill(campaign.body || "", vars), eventName, logo: ev?.logo_url,
            ticketUrl: r.ticket_url, viewUrl: `${SITE_URL}/boleta/${r.view_token}`,
            name, category, dateText,
          }),
        },
      };
    });

    if (test_email) {
      const res = await resend("/emails", emails[0].payload);
      if (!res.ok) return json({ error: "No se pudo enviar la prueba", status: res.status, details: res.text }, 502);
      return json({ sent: 1, test: true });
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];
    const batch = await resend("/emails/batch", emails.map((e) => e.payload));
    if (batch.ok && Array.isArray(batch.data?.data)) {
      emails.forEach((e, i) => results.push({ id: e.r.id, ok: true, error: batch.data.data[i]?.id }));
    } else {
      console.error(`Batch failed [${batch.status}]: ${batch.text}`);
      for (const e of emails) {
        const one = await resend("/emails", e.payload);
        results.push(one.ok ? { id: e.r.id, ok: true, error: one.data?.id } : { id: e.r.id, ok: false, error: `[${one.status}] ${one.text}`.slice(0, 500) });
      }
    }

    const now = new Date().toISOString();
    await Promise.all(results.map((res) => {
      const r = list.find((x: any) => x.id === res.id)!;
      return admin.from("email_campaign_recipients").update(res.ok
        ? { status: "sent", message_id: res.error ?? null, error: null, sent_at: now, attempts: (r.attempts ?? 0) + 1 }
        : { status: "failed", error: res.error, attempts: (r.attempts ?? 0) + 1 }).eq("id", res.id);
    }));

    const { data: counts } = await admin.from("email_campaign_recipients").select("status").eq("campaign_id", campaign_id);
    const sent = counts?.filter((c: any) => c.status === "sent").length ?? 0;
    const failed = counts?.filter((c: any) => c.status === "failed").length ?? 0;
    const pending = (counts?.length ?? 0) - sent - failed;
    await admin.from("email_campaigns").update({
      sent, failed, total: counts?.length ?? 0, status: pending === 0 ? (failed ? "completed_with_errors" : "completed") : "sending",
    }).eq("id", campaign_id);

    const firstErr = results.find((r) => !r.ok)?.error;
    return json({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, firstError: firstErr });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Error" }, 500);
  }
});
