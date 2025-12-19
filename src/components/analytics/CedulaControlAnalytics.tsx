import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEventContext } from '@/context/EventContext';
import { useCedulaControlUsage, useCedulaControlStats } from '@/hooks/useCedulaControlUsage';
import { useControlTypes } from '@/hooks/useSupabaseData';
import { IdCard, Beer, TrendingUp, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const CedulaControlAnalytics = () => {
  const { selectedEvent } = useEventContext();
  const { data: controlUsage = [] } = useCedulaControlUsage(selectedEvent?.id || null);
  const { data: stats } = useCedulaControlStats(selectedEvent?.id || null);
  const { data: controlTypes = [] } = useControlTypes();

  // Get control name by ID
  const getControlName = (controlTypeId: string) => {
    return controlTypes.find(ct => ct.id === controlTypeId)?.name || 'Desconocido';
  };

  // Group by control type for display
  const usageByControl = controlTypes.map(ct => {
    const usages = controlUsage.filter(u => u.control_type_id === ct.id);
    const uniqueCedulas = new Set(usages.map(u => u.numero_cedula)).size;
    return {
      id: ct.id,
      name: ct.name,
      color: ct.color,
      totalUsages: usages.length,
      uniqueCedulas,
    };
  }).filter(ct => ct.totalUsages > 0);

  // Recent activity (last 10)
  const recentActivity = controlUsage.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <IdCard className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Consumos Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.today || 0}</p>
                <p className="text-xs text-muted-foreground">Consumos Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(controlUsage.map(u => u.numero_cedula)).size}
                </p>
                <p className="text-xs text-muted-foreground">Cédulas Únicas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Beer className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{usageByControl.length}</p>
                <p className="text-xs text-muted-foreground">Tipos de Control</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Control Type */}
      {usageByControl.length > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Beer className="h-5 w-5 text-primary" />
              Consumos por Tipo de Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {usageByControl.map(control => (
                <div 
                  key={control.id} 
                  className="p-4 rounded-lg border border-border bg-muted/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: control.color || '#888' }}
                    />
                    <span className="font-semibold text-foreground">{control.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Usos</p>
                      <p className="text-xl font-bold text-foreground">{control.totalUsages}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Personas</p>
                      <p className="text-xl font-bold text-foreground">{control.uniqueCedulas}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Actividad Reciente de Cédulas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.map(activity => (
                <div 
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <IdCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        {activity.numero_cedula}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getControlName(activity.control_type_id)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(activity.used_at), 'HH:mm', { locale: es })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(activity.used_at), 'dd/MM', { locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {controlUsage.length === 0 && (
        <Card className="bg-card/50 border-border">
          <CardContent className="py-12 text-center">
            <IdCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay registros de consumo de cédulas aún.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Los consumos aparecerán aquí cuando se escaneen cédulas con control de consumibles activo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CedulaControlAnalytics;
