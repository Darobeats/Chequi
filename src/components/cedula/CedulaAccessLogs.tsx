import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCedulaAccessLogs } from '@/hooks/useCedulasAutorizadas';
import { ShieldX, Search, FileDown, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface CedulaAccessLogsProps {
  eventId: string;
}

export function CedulaAccessLogs({ eventId }: CedulaAccessLogsProps) {
  const { data: logs = [], isLoading } = useCedulaAccessLogs(eventId);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Solo mostrar rechazados
  const deniedLogs = useMemo(() => {
    return logs.filter(l => l.access_result === 'denied');
  }, [logs]);
  
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return deniedLogs;
    return deniedLogs.filter(l => 
      l.numero_cedula.includes(searchTerm) ||
      l.nombre_detectado?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [deniedLogs, searchTerm]);
  
  const handleExport = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Intentos Rechazados');
      
      worksheet.columns = [
        { header: 'Fecha/Hora', key: 'fecha', width: 20 },
        { header: 'Cédula', key: 'cedula', width: 15 },
        { header: 'Nombre Detectado', key: 'nombre', width: 30 },
        { header: 'Razón', key: 'razon', width: 30 },
      ];
      
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEF4444' }
      };
      
      deniedLogs.forEach((log) => {
        worksheet.addRow({
          fecha: format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
          cedula: log.numero_cedula,
          nombre: log.nombre_detectado || '-',
          razon: log.denial_reason || 'No autorizado',
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const filename = `intentos-rechazados-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
      saveAs(blob, filename);
      
      toast.success(`Exportados ${deniedLogs.length} registros`);
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error('Error al exportar el archivo');
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-dorado flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-red-500" />
            Intentos de Acceso Rechazados
          </CardTitle>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hueso/40" />
              <Input
                placeholder="Buscar por cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-48 bg-gray-900/50 border-gray-700 text-hueso placeholder:text-hueso/40"
              />
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={deniedLogs.length === 0}
              className="border-gray-700"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {deniedLogs.length === 0 ? (
          <div className="text-center py-12 text-hueso/60">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-hueso/30" />
            <p>No hay intentos rechazados registrados</p>
            <p className="text-sm mt-1">Los intentos de acceso no autorizados aparecerán aquí</p>
          </div>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-900/80 hover:bg-gray-900/80">
                  <TableHead className="text-dorado">Fecha/Hora</TableHead>
                  <TableHead className="text-dorado">Cédula</TableHead>
                  <TableHead className="text-dorado">Nombre Detectado</TableHead>
                  <TableHead className="text-dorado">Razón</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-hueso/60">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-hueso/60">
                      No se encontraron resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-900/30">
                      <TableCell className="text-hueso">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell className="font-mono text-hueso">{log.numero_cedula}</TableCell>
                      <TableCell className="text-hueso">{log.nombre_detectado || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-red-500 text-red-400">
                          {log.denial_reason || 'No autorizado'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
