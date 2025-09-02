import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Clock, 
  Users, 
  CalendarDays, 
  TrendingUp, 
  Target, 
  Activity,
  BarChart3,
  Percent
} from 'lucide-react';

interface EnhancedKPIsProps {
  metrics: {
    totalUsages: number;
    uniqueAttendees: number;
    totalAttendees: number;
    participationRate: number;
    peakHour: { hour: string; count: number };
    avgUsagePerAttendee: number;
  };
}

const EnhancedKPIs: React.FC<EnhancedKPIsProps> = ({ metrics }) => {
  const kpis = [
    {
      title: "Total de Usos",
      value: metrics.totalUsages.toLocaleString(),
      icon: Clock,
      color: "text-primary",
      description: "Accesos registrados"
    },
    {
      title: "Usuarios Activos",
      value: metrics.uniqueAttendees.toLocaleString(),
      icon: Users,
      color: "text-emerald-400",
      description: `de ${metrics.totalAttendees} total`
    },
    {
      title: "Tasa de Participación",
      value: `${metrics.participationRate.toFixed(1)}%`,
      icon: Percent,
      color: "text-blue-400",
      description: "Asistentes que han usado controles"
    },
    {
      title: "Pico de Actividad",
      value: metrics.peakHour.hour,
      icon: CalendarDays,
      color: "text-orange-400",
      description: `${metrics.peakHour.count} usos`
    },
    {
      title: "Promedio por Usuario",
      value: metrics.avgUsagePerAttendee.toFixed(1),
      icon: BarChart3,
      color: "text-purple-400",
      description: "Usos por asistente activo"
    },
    {
      title: "Actividad General",
      value: metrics.totalUsages > 50 ? "Alta" : metrics.totalUsages > 20 ? "Media" : "Baja",
      icon: Activity,
      color: metrics.totalUsages > 50 ? "text-green-400" : metrics.totalUsages > 20 ? "text-yellow-400" : "text-red-400",
      description: "Nivel de uso del evento"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index} className="bg-card/50 border-border hover:bg-card/70 transition-colors">
            <CardContent className="flex items-center p-4">
              <Icon className={`h-8 w-8 ${kpi.color} mr-3 flex-shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">{kpi.title}</p>
                <p className={`text-lg font-bold ${kpi.color} truncate`}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground truncate">{kpi.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default EnhancedKPIs;