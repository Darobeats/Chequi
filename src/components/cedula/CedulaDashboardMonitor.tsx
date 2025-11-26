import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCedulaRegistros, useCedulaStats } from '@/hooks/useCedulaRegistros';
import { useActiveEventConfig } from '@/hooks/useEventConfig';
import { CedulaExportButton } from './CedulaExportButton';
import { IdCard, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function CedulaDashboardMonitor() {
  const { data: activeEvent } = useActiveEventConfig();
  const { data: registros = [], isLoading } = useCedulaRegistros(activeEvent?.id || null);
  const { data: stats } = useCedulaStats(activeEvent?.id || null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-16 bg-muted rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-hueso text-sm mb-1">Total Registros</p>
              <p className="text-3xl font-bold text-dorado">{stats?.total || 0}</p>
            </div>
            <IdCard className="h-10 w-10 text-dorado/50" />
          </div>
        </Card>

        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-hueso text-sm mb-1">Hoy</p>
              <p className="text-3xl font-bold text-dorado">{stats?.today || 0}</p>
            </div>
            <TrendingUp className="h-10 w-10 text-dorado/50" />
          </div>
        </Card>

        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-hueso text-sm mb-1">Último Registro</p>
              <p className="text-lg font-medium text-dorado">
                {registros.length > 0 
                  ? format(new Date(registros[0].scanned_at), 'HH:mm', { locale: es })
                  : '--:--'
                }
              </p>
            </div>
            <Clock className="h-10 w-10 text-dorado/50" />
          </div>
        </Card>
      </div>

      {/* Tabla de Registros */}
      <Card className="p-6 bg-gray-900/50 border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-dorado flex items-center gap-2">
            <IdCard className="h-5 w-5" />
            Registros de Cédulas
          </h3>
          <CedulaExportButton 
            registros={registros} 
            eventName={activeEvent?.event_name || 'Evento'}
          />
        </div>

        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-900/80 hover:bg-gray-900/80">
                <TableHead className="text-dorado">Cédula</TableHead>
                <TableHead className="text-dorado">Nombre Completo</TableHead>
                <TableHead className="text-dorado">Hora de Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-hueso/60 py-8">
                    No hay registros de cédulas aún
                  </TableCell>
                </TableRow>
              ) : (
                registros.map((registro) => (
                  <TableRow key={registro.id} className="hover:bg-gray-900/30">
                    <TableCell className="font-mono text-hueso">{registro.numero_cedula}</TableCell>
                    <TableCell className="font-medium text-hueso">{registro.nombre_completo}</TableCell>
                    <TableCell className="text-hueso">
                      {format(new Date(registro.scanned_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
