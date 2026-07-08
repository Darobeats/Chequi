// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import ExcelJS from "npm:exceljs@4.4.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function fetchAll<T = any>(
  admin: any,
  table: string,
  select: string,
  filter: (q: any) => any,
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user + event access via user's JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const eventId = body?.event_id as string | undefined;
    if (!eventId) {
      return new Response(JSON.stringify({ error: "event_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canAccess, error: accessErr } = await userClient.rpc(
      "user_can_access_event",
      { check_event_id: eventId },
    );
    if (accessErr || !canAccess) {
      return new Response(JSON.stringify({ error: "Acceso denegado al evento" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side data pull with service role, filtered by event_id
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const [event, categories, controlTypes, attendees, controlUsage] = await Promise.all([
      admin.from("event_configs").select("event_name,event_date").eq("id", eventId).maybeSingle(),
      admin.from("ticket_categories").select("id,name,color").eq("event_id", eventId),
      admin.from("control_types").select("id,name").eq("event_id", eventId),
      fetchAll<any>(admin, "attendees", "id,ticket_id,name,cedula,category_id,status,qr_code", (q) =>
        q.eq("event_id", eventId).order("category_id", { ascending: true }).order("name", { ascending: true }),
      ),
      fetchAll<any>(
        admin,
        "control_usage",
        "id,attendee_id,control_type_id,used_at,device,notes,attendees!inner(event_id)",
        (q) => q.eq("attendees.event_id", eventId).order("used_at", { ascending: true }),
      ),
    ]);

    const categoryMap = new Map((categories.data ?? []).map((c: any) => [c.id, c]));
    const controlMap = new Map((controlTypes.data ?? []).map((c: any) => [c.id, c]));

    // Aggregations
    const usageByAttendee = new Map<string, any[]>();
    for (const u of controlUsage) {
      const arr = usageByAttendee.get(u.attendee_id) ?? [];
      arr.push(u);
      usageByAttendee.set(u.attendee_id, arr);
    }

    const uniqueAttendees = new Set(controlUsage.map((u) => u.attendee_id));
    const attendedCount = uniqueAttendees.size;
    const totalScans = controlUsage.length;
    const noShowCount = attendees.length - attendedCount;
    const attendanceRate = attendees.length > 0
      ? ((attendedCount / attendees.length) * 100).toFixed(1)
      : "0.0";

    const hourly = new Map<string, number>();
    let firstEntry: Date | null = null;
    let lastEntry: Date | null = null;
    for (const u of controlUsage) {
      const d = new Date(u.used_at);
      if (isNaN(d.getTime())) continue;
      if (!firstEntry || d < firstEntry) firstEntry = d;
      if (!lastEntry || d > lastEntry) lastEntry = d;
      const h = `${String(d.getHours()).padStart(2, "0")}:00`;
      hourly.set(h, (hourly.get(h) ?? 0) + 1);
    }
    let peakHour = "N/A", peakScans = 0;
    for (const [h, c] of hourly) if (c > peakScans) { peakScans = c; peakHour = h; }

    const avgUsesPerPerson = attendedCount > 0
      ? (totalScans / attendedCount).toFixed(1)
      : "0.0";

    // Build workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = "Chequi";
    wb.created = new Date();

    // --- RESUMEN ---
    const s = wb.addWorksheet("RESUMEN");
    s.columns = [{ width: 38 }, { width: 22 }];
    s.addRow(["REPORTE DE ASISTENCIA EMPRESARIAL"]).font = { size: 16, bold: true };
    s.addRow(["Evento:", event.data?.event_name ?? "Sin nombre"]);
    s.addRow(["Fecha del Evento:", event.data?.event_date ?? "N/A"]);
    s.addRow(["Generado:", new Date().toLocaleString("es-ES")]);
    s.addRow(["Generado por:", userData.user.email ?? "Sistema"]);
    s.addRow([]);
    const exec = s.addRow(["=== RESUMEN EJECUTIVO ==="]);
    exec.font = { bold: true, size: 12 };
    s.addRow(["Tickets Emitidos:", attendees.length]);
    s.addRow(["Asistentes Confirmados:", attendedCount]);
    s.addRow(["No se Presentaron:", noShowCount]);
    s.addRow(["Tasa de Asistencia:", `${attendanceRate}%`]);
    s.addRow(["Total de Accesos:", totalScans]);
    s.addRow([]);

    const catHdr = s.addRow(["=== POR CATEGORÍA ==="]);
    catHdr.font = { bold: true, size: 12 };
    const catCols = s.addRow(["Categoría", "Emitidos", "Asistieron", "No-Show", "Tasa %", "Usos"]);
    catCols.font = { bold: true };
    catCols.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4AF37" } };
    for (const cat of categoryMap.values()) {
      const inCat = attendees.filter((a) => a.category_id === cat.id);
      const emitted = inCat.length;
      const attended = inCat.filter((a) => uniqueAttendees.has(a.id)).length;
      const uses = controlUsage.filter((u) => {
        const a = attendees.find((x) => x.id === u.attendee_id);
        return a && a.category_id === cat.id;
      }).length;
      const rate = emitted > 0 ? ((attended / emitted) * 100).toFixed(1) : "0.0";
      s.addRow([cat.name, emitted, attended, emitted - attended, `${rate}%`, uses]);
    }
    s.addRow([]);

    const ctrlHdr = s.addRow(["=== POR TIPO DE CONTROL ==="]);
    ctrlHdr.font = { bold: true, size: 12 };
    const ctrlCols = s.addRow(["Tipo", "Usos", "% Total"]);
    ctrlCols.font = { bold: true };
    ctrlCols.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4AF37" } };
    for (const ct of controlMap.values()) {
      const c = controlUsage.filter((u) => u.control_type_id === ct.id).length;
      const pct = totalScans > 0 ? ((c / totalScans) * 100).toFixed(1) : "0.0";
      s.addRow([ct.name, c, `${pct}%`]);
    }
    s.addRow([]);
    const opHdr = s.addRow(["=== OPERACIÓN ==="]);
    opHdr.font = { bold: true, size: 12 };
    s.addRow(["Primera Entrada:", firstEntry ? firstEntry.toLocaleTimeString("es-ES") : "N/A"]);
    s.addRow(["Última Entrada:", lastEntry ? lastEntry.toLocaleTimeString("es-ES") : "N/A"]);
    s.addRow(["Hora Pico:", peakHour]);
    s.addRow(["Promedio Usos/Asistente:", avgUsesPerPerson]);

    // --- ASISTENTES ---
    const a = wb.addWorksheet("ASISTENTES");
    a.columns = [
      { header: "¿ASISTIÓ?", key: "asistio", width: 11 },
      { header: "Total Usos", key: "tu", width: 11 },
      { header: "Nombre", key: "nombre", width: 32 },
      { header: "Cédula", key: "ced", width: 15 },
      { header: "Categoría", key: "cat", width: 18 },
      { header: "Código QR", key: "qr", width: 30 },
      { header: "Estado", key: "st", width: 11 },
      { header: "Primera Entrada", key: "pe", width: 16 },
      { header: "Última Entrada", key: "ue", width: 16 },
      { header: "Controles Usados", key: "cu", width: 35 },
      { header: "Fecha Uso", key: "fu", width: 14 },
      { header: "Hora Uso", key: "hu", width: 11 },
      { header: "Tipo Acceso", key: "ta", width: 20 },
      { header: "Dispositivo", key: "dv", width: 14 },
      { header: "Notas", key: "nt", width: 24 },
    ];
    a.getRow(1).font = { bold: true };
    a.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4AF37" } };
    a.views = [{ state: "frozen", ySplit: 1 }];
    a.autoFilter = { from: "A1", to: "O1" };

    for (const at of attendees) {
      const usage = usageByAttendee.get(at.id) ?? [];
      const cat = categoryMap.get(at.category_id);
      const status = at.status === "valid" ? "Válido" : at.status === "used" ? "Usado" : "Bloqueado";
      if (usage.length === 0) {
        const row = a.addRow({
          asistio: "NO", tu: 0, nombre: at.name, ced: at.cedula ?? "N/A",
          cat: cat?.name ?? "N/A", qr: at.qr_code ?? "No generado", st: status,
          pe: "Sin registros", ue: "Sin registros", cu: "Sin registros",
          fu: "-", hu: "-", ta: "-", dv: "-", nt: "-",
        });
        row.getCell("asistio").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6B6B" } };
        row.getCell("asistio").font = { bold: true, color: { argb: "FFFFFFFF" } };
      } else {
        const times = usage.map((u) => new Date(u.used_at));
        const first = new Date(Math.min(...times.map((d) => d.getTime())));
        const last = new Date(Math.max(...times.map((d) => d.getTime())));
        const controlsUsed = [...new Set(usage.map((u) => controlMap.get(u.control_type_id)?.name ?? "N/A"))].join(", ");
        const u0 = usage[0];
        const d0 = new Date(u0.used_at);
        const firstRow = a.addRow({
          asistio: "SÍ", tu: usage.length, nombre: at.name, ced: at.cedula ?? "N/A",
          cat: cat?.name ?? "N/A", qr: at.qr_code ?? "No generado", st: status,
          pe: first.toLocaleTimeString("es-ES"), ue: last.toLocaleTimeString("es-ES"),
          cu: controlsUsed, fu: d0.toLocaleDateString("es-ES"), hu: d0.toLocaleTimeString("es-ES"),
          ta: controlMap.get(u0.control_type_id)?.name ?? "N/A", dv: u0.device ?? "N/A", nt: u0.notes ?? "",
        });
        firstRow.getCell("asistio").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF51CF66" } };
        firstRow.getCell("asistio").font = { bold: true };
        for (let i = 1; i < usage.length; i++) {
          const u = usage[i];
          const d = new Date(u.used_at);
          a.addRow({
            asistio: "", tu: "", nombre: "", ced: "", cat: "", qr: "", st: "",
            pe: "", ue: "", cu: "",
            fu: d.toLocaleDateString("es-ES"), hu: d.toLocaleTimeString("es-ES"),
            ta: controlMap.get(u.control_type_id)?.name ?? "N/A",
            dv: u.device ?? "N/A", nt: u.notes ?? "",
          });
        }
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte_asistentes_${eventId}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("[export-attendees-report] error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
