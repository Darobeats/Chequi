import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Activity, TrendingUp, Target } from 'lucide-react';

interface Props {
  totalUsages: number;
  uniqueAttendees: number;
  totalAttendees: number;
  participationRate: number;
  peakHour: { hour: string; count: number };
  projection?: { predicted: number; eta: string | null } | null;
}

const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
  children?: React.ReactNode;
}> = ({ icon, label, value, sub, accent = 'text-primary', children }) => (
  <Card className="min-w-[160px] flex-1 bg-card/50 border-border p-3 snap-start">
    <div className="flex items-start gap-2">
      <div className={`${accent} mt-0.5 shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
        <p className={`text-xl font-bold ${accent} leading-tight truncate`}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</p>}
        {children}
      </div>
    </div>
  </Card>
);

const AnalyticsKPIStrip: React.FC<Props> = ({
  totalUsages,
  uniqueAttendees,
  totalAttendees,
  participationRate,
  peakHour,
  projection,
}) => {
  return (
    <div className="flex gap-3 overflow-x-auto snap-x pb-1 -mx-1 px-1 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible">
      <KpiCard
        icon={<Activity className="h-5 w-5" />}
        label="Ingresos totales"
        value={totalUsages.toLocaleString()}
        sub={`Pico ${peakHour.hour} · ${peakHour.count}`}
        accent="text-primary"
      />
      <KpiCard
        icon={<Users className="h-5 w-5" />}
        label="Asistentes únicos"
        value={`${uniqueAttendees.toLocaleString()}`}
        sub={`de ${totalAttendees.toLocaleString()} · ${participationRate.toFixed(1)}%`}
        accent="text-emerald-400"
      >
        <Progress value={participationRate} className="h-1.5 mt-2" />
      </KpiCard>
      <KpiCard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Pico de actividad"
        value={peakHour.hour}
        sub={`${peakHour.count} usos en la hora`}
        accent="text-orange-400"
      />
      <KpiCard
        icon={<Target className="h-5 w-5" />}
        label="Proyección"
        value={projection?.predicted ? projection.predicted.toLocaleString() : '—'}
        sub={projection?.eta ? `Próx. hito ${projection.eta}` : 'Estimado del día'}
        accent="text-blue-400"
      />
    </div>
  );
};

export default AnalyticsKPIStrip;
