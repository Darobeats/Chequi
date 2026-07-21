// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import ExcelJS from "npm:exceljs@4.4.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TZ = "America/Bogota";

function fmtInTZ(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: TZ, ...opts }).format(new Date(iso));
}
function dayKey(iso: string): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(iso));
  const y = p.find((x) => x.type === "year")!.value;
  const m = p.find((x) => x.type === "month")!.value;
  const d = p.find((x) => x.type === "day")!.value;
  return `${y}-${m}-${d}`;
}
function hourKey(iso: string): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const h = p.find((x) => x.type === "hour")!.value;
  return `${h}:00`;
}

async function fetchAll<T = any>(
  admin: any, table: string, select: string, filter: (q: any) => any,
): Promise<T[]> {
  const page = 1000;
  const out: T[] = [];
  let from = 0;
  while (true) {
    let q = admin.from(table).select(select).range(from, from + page - 1);
    q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < page) break;
    from += page;
  }
  return out;
}

const GOLD = "FFD4AF37";
const SUB = "FFF3E9C6";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const eventId = body?.event_id as string | undefined;
    if (!eventId) {
      return new Response(JSON.stringify({ error: "event_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canAccess, error: accessErr } = await userClient.rpc(
      "user_can_access_event", { check_event_id: eventId },
    );
    if (accessErr || !canAccess) {
      return new Response(JSON.stringify({ error: "Acceso denegado al evento" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use user client for the RPC (SECURITY DEFINER checks auth.uid())
    const { data: summary, error: sumErr } = await userClient.rpc(
      "get_event_summary_report" as any, { p_event_id: eventId },
    );
    if (sumErr) throw sumErr;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const [event, categories, controlTypes, attendees, controlUsage, cedulaUsage] = await Promise.all([
      admin.from("event_configs").select("event_name,event_date,event_start_date,event_end_date").eq("id", eventId).maybeSingle(),
      admin.from("ticket_categories").select("id,name,color").eq("event_id", eventId),
      admin.from("control_types").select("id,name,color").eq("event_id", eventId),
      fetchAll<any>(admin, "attendees", "id,ticket_id,name,cedula,category_id,status,qr_code", (q) =>
        q.eq("event_id", eventId).order("name", { ascending: true }),
      ),
      fetchAll<any>(
        admin, "control_usage",
        "id,attendee_id,control_type_id,used_at,device,notes,attendees!inner(event_id,name,cedula,category_id)",
        (q) => q.eq("attendees.event_id", eventId).order("used_at", { ascending: true }),
      ),
      fetchAll<any>(
        admin, "cedula_control_usage",
        "id,numero_cedula,control_type_id,used_at,event_id",
        (q) => q.eq("event_id", eventId).order("used_at", { ascending: true }),
      ),
    ]);

    const catMap = new Map((categories.data ?? []).map((c: any) => [c.id, c]));
    const ctrlMap = new Map((controlTypes.data ?? []).map((c: any) => [c.id, c]));
    const evName = event.data?.event_name ?? "Evento";
    const startDate = event.data?.event_start_date ?? event.data?.event_date ?? null;
    const endDate = event.data?.event_end_date ?? startDate;

    const wb = new ExcelJS.Workbook();
    wb.creator = "Chequi";
    wb.created = new Date();

    const stylize = (row: ExcelJS.Row, color = GOLD) => {
      row.font = { bold: true, color: { argb: "FF000000" } };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    };

    // ---------------- 1. PORTADA ----------------
    const s1 = wb.addWorksheet("PORTADA");
    s1.columns = [{ width: 32 }, { width: 30 }];
    s1.addRow(["RESUMEN DE CIERRE DEL EVENTO"]).font = { size: 18, bold: true };
    s1.addRow(["Evento:", evName]);
    s1.addRow([
      "Fechas:",
      startDate && endDate
        ? (startDate === endDate ? startDate : `${startDate}  →  ${endDate}`)
        : "N/A",
    ]);
    s1.addRow(["Duración (días):", summary?.daily?.length ?? 0]);
    s1.addRow(["Generado:", new Date().toLocaleString("es-CO", { timeZone: TZ })]);
    s1.addRow(["Generado por:", userData.user.email ?? "Sistema"]);
    s1.addRow(["Zona horaria:", TZ]);
    s1.addRow([]);
    stylize(s1.addRow(["=== KPIs DE CIERRE ==="]));
    const k = summary?.kpis ?? {};
    s1.addRow(["Tickets emitidos:", k.total_tickets ?? 0]);
    s1.addRow(["Asistentes únicos:", k.unique_attendees ?? 0]);
    s1.addRow(["Tasa de asistencia:", `${k.attendance_rate ?? 0}%`]);
    s1.addRow(["Total escaneos:", k.total_scans ?? 0]);
    s1.addRow(["Promedio escaneos/asistente:", k.avg_scans_per_attendee ?? 0]);
    s1.addRow(["Hora pico global:", `${k.peak_hour ?? "--"} (${k.peak_hour_count ?? 0} escaneos)`]);
    s1.addRow(["Mejor día:", k.best_day ? `${k.best_day} (${k.best_day_count} escaneos)` : "N/A"]);
    if ((summary?.cedula?.authorized ?? 0) > 0 || (summary?.cedula?.registered ?? 0) > 0) {
      s1.addRow([]);
      stylize(s1.addRow(["=== CÉDULAS ==="]));
      s1.addRow(["Autorizadas:", summary.cedula.authorized]);
      s1.addRow(["Registradas:", summary.cedula.registered]);
      s1.addRow(["Escaneos:", summary.cedula.scans]);
    }

    // ---------------- 2. RESUMEN DIARIO ----------------
    const s2 = wb.addWorksheet("RESUMEN DIARIO");
    s2.columns = [
      { header: "Fecha", key: "day", width: 14 },
      { header: "Escaneos", key: "scans", width: 12 },
      { header: "Asistentes únicos", key: "uniq", width: 18 },
      { header: "Hora pico", key: "peak", width: 12 },
      { header: "Escaneos en pico", key: "peakn", width: 18 },
    ];
    stylize(s2.getRow(1));
    s2.views = [{ state: "frozen", ySplit: 1 }];
    for (const d of summary?.daily ?? []) {
      s2.addRow({
        day: d.day, scans: Number(d.scans), uniq: Number(d.unique_subjects),
        peak: d.peak_hour ?? "--", peakn: Number(d.peak_count ?? 0),
      });
    }

    // ---------------- 3. POR CATEGORÍA ----------------
    const s3 = wb.addWorksheet("POR CATEGORÍA");
    s3.columns = [
      { header: "Categoría", key: "name", width: 28 },
      { header: "Emitidos", key: "iss", width: 12 },
      { header: "Asistieron", key: "att", width: 12 },
      { header: "No-Show", key: "ns", width: 12 },
      { header: "Tasa %", key: "rate", width: 10 },
      { header: "Usos totales", key: "uses", width: 14 },
    ];
    stylize(s3.getRow(1));
    for (const c of summary?.by_category ?? []) {
      const iss = Number(c.issued), att = Number(c.attended);
      s3.addRow({
        name: c.name, iss, att, ns: iss - att,
        rate: iss > 0 ? Number(((att / iss) * 100).toFixed(1)) : 0,
        uses: Number(c.uses),
      });
    }

    // ---------------- 4. POR TIPO DE CONTROL ----------------
    const s4 = wb.addWorksheet("POR CONTROL");
    s4.columns = [
      { header: "Tipo de control", key: "name", width: 28 },
      { header: "Usos", key: "uses", width: 12 },
      { header: "% del total", key: "pct", width: 12 },
      { header: "Usuarios únicos", key: "uniq", width: 18 },
    ];
    stylize(s4.getRow(1));
    const totalScans = Number(k.total_scans ?? 0);
    for (const c of summary?.by_control ?? []) {
      const uses = Number(c.uses);
      s4.addRow({
        name: c.name, uses,
        pct: totalScans > 0 ? Number(((uses / totalScans) * 100).toFixed(1)) : 0,
        uniq: Number(c.unique_users),
      });
    }

    // ---------------- 5. HORA POR DÍA ----------------
    const s5 = wb.addWorksheet("HORA x DIA");
    s5.columns = [
      { header: "Fecha", key: "day", width: 14 },
      { header: "Hora", key: "hour", width: 10 },
      { header: "Escaneos", key: "cnt", width: 12 },
    ];
    stylize(s5.getRow(1));
    for (const h of summary?.hourly_by_day ?? []) {
      s5.addRow({ day: h.day, hour: h.hour, cnt: Number(h.cnt) });
    }

    // ---------------- 6. DETALLE DE ACCESOS ----------------
    const s6 = wb.addWorksheet("DETALLE ACCESOS");
    s6.columns = [
      { header: "Fecha (Bogotá)", key: "date", width: 12 },
      { header: "Hora (Bogotá)", key: "time", width: 10 },
      { header: "Fuente", key: "src", width: 10 },
      { header: "Identificador", key: "who", width: 24 },
      { header: "Nombre", key: "name", width: 32 },
      { header: "Categoría", key: "cat", width: 20 },
      { header: "Tipo de control", key: "ctrl", width: 22 },
      { header: "Dispositivo", key: "dev", width: 14 },
      { header: "Notas", key: "notes", width: 24 },
    ];
    stylize(s6.getRow(1));
    s6.views = [{ state: "frozen", ySplit: 1 }];
    s6.autoFilter = { from: "A1", to: "I1" };

    for (const u of controlUsage) {
      const a = u.attendees;
      s6.addRow({
        date: dayKey(u.used_at),
        time: fmtInTZ(u.used_at, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
        src: "QR",
        who: a?.cedula ?? "",
        name: a?.name ?? "",
        cat: catMap.get(a?.category_id)?.name ?? "",
        ctrl: ctrlMap.get(u.control_type_id)?.name ?? "",
        dev: u.device ?? "",
        notes: u.notes ?? "",
      });
    }
    for (const u of cedulaUsage) {
      s6.addRow({
        date: dayKey(u.used_at),
        time: fmtInTZ(u.used_at, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
        src: "CÉDULA",
        who: u.numero_cedula ?? "",
        name: "",
        cat: "",
        ctrl: ctrlMap.get(u.control_type_id)?.name ?? "",
        dev: "",
        notes: "",
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="resumen_${eventId}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("[export-event-summary] error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
