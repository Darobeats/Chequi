import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { IdCard, Users, ShieldX, Clock, Utensils } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { bogotaHour, bogotaTime } from '@/lib/timezone';

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const isAccess = (n: string) => /ingreso|entrada|acceso|access|entry/i.test(n);

/** Resumen de un evento con registro por cédula (ID): ingresos, rechazos, horas y consumos. */
const CedulaSummaryBlock: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { data } = useQuery({
    queryKey: ['cedula_summary_block', eventId],
    refetchInterval: 30000,
    queryFn: async () => {
      const [regs, usage, controls, denied, wl] = await Promise.all([
        fetchAll<any>((f, t) => supabase.from('cedula_registros').select('numero_cedula, nombre_completo, scanned_at, was_on_whitelist').eq('event_id', eventId).order('scanned_at', { ascending: false }).range(f, t)),
        fetchAll<any>((f, t) => supabase.from('cedula_control_usage').select('control_type_id, numero_cedula').eq('event_id', eventId).range(f, t)),
        supabase.from('control_types').select('id, name, color').eq('event_id', eventId),
        supabase.from('cedula_access_logs').select('id', { count: 'exact', head: true }).eq('event_id', eventId).neq('access_result', 'authorized'),
        supabase.from('cedulas_autorizadas').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
      ]);
      return { regs, usage, controls: controls.data ?? [], denied: denied.count ?? 0, whitelist: wl.count ?? 0 };
    },
  });
  if (!data || (data.regs.length === 0 && data.whitelist === 0)) return null;

  const hours = new Array(24).fill(0);
  data.regs.forEach(r => { hours[bogotaHour(r.scanned_at)]++; });
  const peak = hours.reduce((b, v, i) => (v > hours[b] ? i : b), 0);
  const active = hours.map((v, h) => ({ h, v })).filter(x => x.v > 0);
  const maxH = Math.max(1, ...hours);
  const byControl = data.controls.map((c: any) => ({ ...c, uses: data.usage.filter(u => u.control_type_id === c.id).length }))
    .filter((c: any) => c.uses > 0 || !isAccess(c.name));
  const consumos = byControl.filter((c: any) => !isAccess(c.name)).reduce((s: number, c: any) => s + c.uses, 0);
  const rate = data.whitelist > 0 ? Math.round((data.regs.filter(r => r.was_on_whitelist !== false).length / data.whitelist) * 100) : null;

  const Kpi = ({ icon, label, value, sub, cls }: any) => (
    <Card className="p-3 sm:p-4 bg-card/60">
      <div className={`flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground`}><span className={cls}>{icon}</span>{label}</div>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
    </Card>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-dorado flex items-center gap-2"><IdCard className="h-5 w-5" /> Registro por cédula</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Users className="h-4 w-4" />} label="Ingresaron" value={data.regs.length.toLocaleString('es-CO')} sub={rate !== null ? `${rate}% de ${data.whitelist.toLocaleString('es-CO')} autorizados` : undefined} cls="text-emerald-400" />
        <Kpi icon={<ShieldX className="h-4 w-4" />} label="Rechazados" value={data.denied.toLocaleString('es-CO')} cls="text-red-400" />
        <Kpi icon={<Clock className="h-4 w-4" />} label="Hora pico" value={active.length ? `${String(peak).padStart(2, '0')}:00` : '—'} sub={active.length ? `${hours[peak]} ingresos` : undefined} cls="text-orange-400" />
        <Kpi icon={<Utensils className="h-4 w-4" />} label="Consumos" value={consumos.toLocaleString('es-CO')} cls="text-blue-400" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Ingresos por hora (Bogotá)</p>
          {active.length === 0 ? <p className="text-sm text-muted-foreground">Sin ingresos.</p> : active.map(({ h, v }) => (
            <div key={h} className="flex items-center gap-2 text-xs mb-1.5">
              <span className="w-12 tabular-nums text-muted-foreground">{String(h).padStart(2, '0')}:00</span>
              <div className="flex-1 h-2 bg-secondary rounded overflow-hidden"><div className="h-full bg-dorado" style={{ width: `${(v / maxH) * 100}%` }} /></div>
              <span className="w-8 text-right tabular-nums">{v}</span>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Por control</p>
          {byControl.length === 0 ? <p className="text-sm text-muted-foreground">Sin controles.</p> : byControl.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || 'hsl(var(--primary))' }} />{c.name}</span>
              <span className="tabular-nums font-semibold">{c.uses}</span>
            </div>
          ))}
          <p className="text-sm font-semibold text-foreground mt-4 mb-2">Últimos ingresos</p>
          {data.regs.slice(0, 5).map((r, i) => (
            <div key={i} className="flex justify-between text-xs py-0.5 gap-2">
              <span className="truncate">{r.nombre_completo || r.numero_cedula}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{bogotaTime(r.scanned_at)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

export default CedulaSummaryBlock;
