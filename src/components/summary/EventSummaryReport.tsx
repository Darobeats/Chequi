import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Calendar, Users, Ticket, Activity, TrendingUp, Clock, CheckCircle2, IdCard } from 'lucide-react';
import { useEventContext } from '@/context/EventContext';
import { useEventSummary, type EventSummary } from '@/hooks/useEventSummary';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return 1;
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const start = new Date(ay, am - 1, ad).getTime();
  const end = new Date(by, bm - 1, bd).getTime();
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }> = ({
  icon, label, value, sub, accent = 'text-primary',
}) => (
  <Card className="p-4 bg-card/60 border-border">
    <div className="flex items-start gap-3">
      <div className={`${accent} shrink-0 mt-0.5`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${accent} leading-tight truncate`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  </Card>
);

const EventSummaryReport: React.FC = () => {
  const { t } = useTranslation('common');
  const { selectedEvent } = useEventContext();
  const { data, isLoading, error } = useEventSummary(selectedEvent?.id);
  const { toast } = useToast();
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    if (!selectedEvent?.id) return;
    setExporting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-event-summary`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ event_id: selectedEvent.id }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Error generando reporte');
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `resumen_${selectedEvent.event_name.replace(/[^a-z0-9]+/gi, '_')}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: 'Resumen exportado', description: 'Se descargó el reporte de cierre.' });
    } catch (e: any) {
      toast({ title: 'Error al exportar', description: e?.message ?? String(e), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Selecciona un evento para ver el resumen.
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando resumen del evento…
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 text-destructive">
        No se pudo cargar el resumen. {(error as any)?.message ?? ''}
      </Card>
    );
  }

  const summary = data as EventSummary;
  const durationDays = daysBetween(summary.start_date, summary.end_date);
  const dailyMax = Math.max(1, ...summary.daily.map((d) => Number(d.scans)));
  const catAttendMax = Math.max(1, ...summary.by_category.map((c) => Number(c.issued) || 0));
  const controlMax = Math.max(1, ...summary.by_control.map((c) => Number(c.uses) || 0));
  const hasCedula = summary.cedula.authorized > 0 || summary.cedula.registered > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-5 bg-gradient-to-br from-card to-card/60 border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-dorado truncate">{selectedEvent.event_name}</h2>
              <Badge variant="outline" className="border-dorado/50 text-dorado">
                {durationDays === 1 ? '1 día' : `${durationDays} días`}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              {fmtDate(summary.start_date)}
              {summary.end_date && summary.end_date !== summary.start_date && ` – ${fmtDate(summary.end_date)}`}
              <span className="opacity-50">·</span>
              <span>Generado {new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })} (Bogotá)</span>
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting} className="bg-dorado text-empresarial hover:bg-dorado/90 font-semibold">
            {exporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando…</> : <><Download className="h-4 w-4 mr-2" />Exportar Resumen (Excel)</>}
          </Button>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Ticket className="h-5 w-5" />} label="Tickets emitidos" value={summary.kpis.total_tickets.toLocaleString()} accent="text-primary" />
        <Kpi icon={<Users className="h-5 w-5" />} label="Asistentes únicos" value={summary.kpis.unique_attendees.toLocaleString()} sub={`Tasa ${summary.kpis.attendance_rate}%`} accent="text-emerald-400" />
        <Kpi icon={<Activity className="h-5 w-5" />} label="Total escaneos" value={summary.kpis.total_scans.toLocaleString()} sub={`${summary.kpis.avg_scans_per_attendee} por asistente`} accent="text-blue-400" />
        <Kpi icon={<Clock className="h-5 w-5" />} label="Hora pico" value={summary.kpis.peak_hour} sub={`${summary.kpis.peak_hour_count} escaneos`} accent="text-orange-400" />
      </div>

      {/* Daily breakdown */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-dorado" />
          <h3 className="text-lg font-semibold text-dorado">Desglose diario</h3>
          {summary.kpis.best_day && (
            <Badge variant="outline" className="ml-auto border-emerald-500/50 text-emerald-400">
              Mejor día: {fmtDate(summary.kpis.best_day)} · {summary.kpis.best_day_count} escaneos
            </Badge>
          )}
        </div>
        {summary.daily.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin actividad registrada.</p>
        ) : (
          <div className="space-y-2">
            {summary.daily.map((d) => (
              <div key={d.day} className="grid grid-cols-12 items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="col-span-4 md:col-span-3 text-sm text-foreground font-medium truncate">{fmtDate(d.day)}</div>
                <div className="col-span-6 md:col-span-6">
                  <div className="h-2 bg-secondary rounded overflow-hidden">
                    <div className="h-full bg-dorado" style={{ width: `${(Number(d.scans) / dailyMax) * 100}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {d.unique_subjects} únicos · Pico {d.peak_hour ?? '--'} ({d.peak_count ?? 0})
                  </p>
                </div>
                <div className="col-span-2 md:col-span-3 text-right">
                  <span className="text-lg font-bold text-dorado">{Number(d.scans).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground ml-1">escaneos</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Category + Control side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-dorado mb-4 flex items-center gap-2">
            <Ticket className="h-5 w-5" /> Por categoría
          </h3>
          {summary.by_category.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin categorías configuradas.</p>
          ) : (
            <div className="space-y-3">
              {summary.by_category.map((c) => {
                const issued = Number(c.issued);
                const attended = Number(c.attended);
                const rate = issued > 0 ? (attended / issued) * 100 : 0;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || '#64748b' }} />
                        <span className="text-foreground truncate">{c.name}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums text-xs">
                        {attended}/{issued} · {rate.toFixed(1)}% · {Number(c.uses)} usos
                      </span>
                    </div>
                    <Progress value={rate} className="h-1.5 mt-1" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-dorado mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Por tipo de control
          </h3>
          {summary.by_control.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin controles configurados.</p>
          ) : (
            <div className="space-y-3">
              {summary.by_control.map((c) => {
                const uses = Number(c.uses);
                const pct = summary.kpis.total_scans > 0 ? (uses / summary.kpis.total_scans) * 100 : 0;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || '#64748b' }} />
                        <span className="text-foreground truncate">{c.name}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums text-xs">
                        {uses} · {pct.toFixed(1)}% · {Number(c.unique_users)} únicos
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded mt-1 overflow-hidden">
                      <div className="h-full" style={{ width: `${(uses / controlMax) * 100}%`, backgroundColor: c.color || 'hsl(var(--primary))' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Cedula */}
      {hasCedula && (
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-dorado mb-4 flex items-center gap-2">
            <IdCard className="h-5 w-5" /> Cédulas
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{summary.cedula.authorized.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Autorizadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{summary.cedula.registered.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Registradas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{summary.cedula.scans.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Escaneos</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EventSummaryReport;
