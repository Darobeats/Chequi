import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { CedulaRegistro, CedulaAutorizada, CedulaAccessLog } from '@/types/cedula';
import type { CedulaControlUsage } from '@/hooks/useCedulaControlUsage';
import type { ControlType } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CedulaExportButtonProps {
  registros: CedulaRegistro[];
  eventName?: string;
  autorizadas?: CedulaAutorizada[];
  accessLogs?: CedulaAccessLog[];
  controlUsage?: CedulaControlUsage[];
  controlTypes?: ControlType[];
}

export function CedulaExportButton({ 
  registros, 
  eventName = 'Evento',
  autorizadas = [],
  accessLogs = [],
  controlUsage = [],
  controlTypes = []
}: CedulaExportButtonProps) {

  const getControlName = (controlTypeId: string) => {
    return controlTypes.find(ct => ct.id === controlTypeId)?.name || controlTypeId;
  };

  const handleExport = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      // Build control usage map per cedula
      const usageByCedula = new Map<string, { types: Set<string>; total: number }>();
      controlUsage.forEach(u => {
        const entry = usageByCedula.get(u.numero_cedula) || { types: new Set<string>(), total: 0 };
        entry.types.add(getControlName(u.control_type_id));
        entry.total++;
        usageByCedula.set(u.numero_cedula, entry);
      });
      
      // ===== Hoja 1: Registros de Cédulas (enriched) =====
      const worksheet = workbook.addWorksheet('Registros de Cédulas');
      worksheet.columns = [
        { header: 'Cédula', key: 'cedula', width: 15 },
        { header: 'Nombres', key: 'nombres', width: 20 },
        { header: 'Primer Apellido', key: 'primerApellido', width: 20 },
        { header: 'Segundo Apellido', key: 'segundoApellido', width: 20 },
        { header: 'Nombre Completo', key: 'nombreCompleto', width: 40 },
        { header: 'Fecha Nacimiento', key: 'fechaNacimiento', width: 15 },
        { header: 'Sexo', key: 'sexo', width: 10 },
        { header: 'RH', key: 'rh', width: 10 },
        { header: 'Lugar Expedición', key: 'lugarExpedicion', width: 20 },
        { header: 'Fecha Registro', key: 'fechaRegistro', width: 20 },
        { header: 'Controles Usados', key: 'controlesUsados', width: 30 },
        { header: 'Total Usos', key: 'totalUsos', width: 12 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };

      registros.forEach((registro) => {
        const usage = usageByCedula.get(registro.numero_cedula);
        worksheet.addRow({
          cedula: registro.numero_cedula,
          nombres: registro.nombres,
          primerApellido: registro.primer_apellido,
          segundoApellido: registro.segundo_apellido || '',
          nombreCompleto: registro.nombre_completo,
          fechaNacimiento: registro.fecha_nacimiento || '',
          sexo: registro.sexo === 'M' ? 'Masculino' : registro.sexo === 'F' ? 'Femenino' : '',
          rh: registro.rh || '',
          lugarExpedicion: registro.lugar_expedicion || '',
          fechaRegistro: format(new Date(registro.scanned_at), 'dd/MM/yyyy HH:mm', { locale: es }),
          controlesUsados: usage ? Array.from(usage.types).join(', ') : '-',
          totalUsos: usage?.total || 0,
        });
      });

      // ===== Hoja 2: Registros por Control =====
      if (controlUsage.length > 0) {
        const controlSheet = workbook.addWorksheet('Registros por Control');
        controlSheet.columns = [
          { header: 'Fecha/Hora', key: 'fecha', width: 20 },
          { header: 'Cédula', key: 'cedula', width: 15 },
          { header: 'Nombre Completo', key: 'nombre', width: 35 },
          { header: 'Tipo de Control', key: 'tipoControl', width: 20 },
          { header: 'Dispositivo', key: 'dispositivo', width: 25 },
          { header: 'Notas', key: 'notas', width: 30 },
        ];

        controlSheet.getRow(1).font = { bold: true };
        controlSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };

        // Sort chronologically
        const sortedUsage = [...controlUsage].sort((a, b) => new Date(a.used_at).getTime() - new Date(b.used_at).getTime());
        
        // Build name lookup from registros
        const nameMap = new Map(registros.map(r => [r.numero_cedula, r.nombre_completo || '']));

        sortedUsage.forEach((usage) => {
          controlSheet.addRow({
            fecha: format(new Date(usage.used_at), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
            cedula: usage.numero_cedula,
            nombre: nameMap.get(usage.numero_cedula) || '-',
            tipoControl: getControlName(usage.control_type_id),
            dispositivo: usage.device || '-',
            notas: usage.notes || '-',
          });
        });

        // ===== Hoja 3: Resumen por Control =====
        const summaryControlSheet = workbook.addWorksheet('Resumen por Control');
        
        // Totals per control type
        const byControlType = new Map<string, { count: number; first: Date; last: Date; byHour: Map<number, number> }>();
        controlUsage.forEach(u => {
          const name = getControlName(u.control_type_id);
          const date = new Date(u.used_at);
          const hour = date.getHours();
          const entry = byControlType.get(name) || { count: 0, first: date, last: date, byHour: new Map() };
          entry.count++;
          if (date < entry.first) entry.first = date;
          if (date > entry.last) entry.last = date;
          entry.byHour.set(hour, (entry.byHour.get(hour) || 0) + 1);
          byControlType.set(name, entry);
        });

        summaryControlSheet.addRow(['RESUMEN POR TIPO DE CONTROL']);
        summaryControlSheet.getRow(1).font = { bold: true, size: 14 };
        summaryControlSheet.addRow(['']);
        
        summaryControlSheet.addRow(['Tipo de Control', 'Total Usos', 'Primer Uso', 'Último Uso']);
        const headerRow = summaryControlSheet.getRow(3);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

        byControlType.forEach((data, name) => {
          summaryControlSheet.addRow([
            name,
            data.count,
            format(data.first, 'dd/MM/yyyy HH:mm', { locale: es }),
            format(data.last, 'dd/MM/yyyy HH:mm', { locale: es }),
          ]);
        });

        // Hourly breakdown
        const currentRow = summaryControlSheet.rowCount + 2;
        summaryControlSheet.addRow(['']);
        summaryControlSheet.addRow(['DESGLOSE POR HORA']);
        summaryControlSheet.getRow(currentRow + 1).font = { bold: true, size: 12 };
        
        const hourHeaders = ['Hora', ...Array.from(byControlType.keys())];
        summaryControlSheet.addRow(hourHeaders);
        const hourHeaderRow = summaryControlSheet.getRow(summaryControlSheet.rowCount);
        hourHeaderRow.font = { bold: true };
        hourHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };

        for (let h = 0; h < 24; h++) {
          const hourLabel = `${h.toString().padStart(2, '0')}:00`;
          const hourData = [hourLabel, ...Array.from(byControlType.values()).map(d => d.byHour.get(h) || 0)];
          summaryControlSheet.addRow(hourData);
        }

        summaryControlSheet.getColumn(1).width = 20;
        summaryControlSheet.getColumn(2).width = 15;
        summaryControlSheet.getColumn(3).width = 20;
        summaryControlSheet.getColumn(4).width = 20;
      }

      // ===== Hoja: Lista de Acceso =====
      if (autorizadas.length > 0) {
        const registeredCedulas = new Set(registros.map(r => r.numero_cedula));
        const whitelistSheet = workbook.addWorksheet('Lista de Acceso');
        
        whitelistSheet.columns = [
          { header: 'Cédula', key: 'cedula', width: 15 },
          { header: 'Nombre', key: 'nombre', width: 35 },
          { header: 'Categoría', key: 'categoria', width: 15 },
          { header: 'Empresa', key: 'empresa', width: 20 },
          { header: 'Estado', key: 'estado', width: 15 },
          { header: 'Hora Registro', key: 'horaRegistro', width: 20 },
        ];

        whitelistSheet.getRow(1).font = { bold: true };
        whitelistSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

        autorizadas.forEach((autorizada) => {
          const registro = registros.find(r => r.numero_cedula === autorizada.numero_cedula);
          const isRegistered = registeredCedulas.has(autorizada.numero_cedula);
          
          whitelistSheet.addRow({
            cedula: autorizada.numero_cedula,
            nombre: autorizada.nombre_completo || '-',
            categoria: autorizada.categoria || '-',
            empresa: autorizada.empresa || '-',
            estado: isRegistered ? '✓ Registrado' : '○ Pendiente',
            horaRegistro: registro ? format(new Date(registro.scanned_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '-',
          });
        });
      }

      // ===== Hoja: Rechazados =====
      const deniedLogs = accessLogs.filter(l => l.access_result === 'denied');
      if (deniedLogs.length > 0) {
        const rejectedSheet = workbook.addWorksheet('Rechazados');
        rejectedSheet.columns = [
          { header: 'Fecha/Hora', key: 'fecha', width: 20 },
          { header: 'Cédula', key: 'cedula', width: 15 },
          { header: 'Nombre Detectado', key: 'nombre', width: 35 },
          { header: 'Razón', key: 'razon', width: 30 },
        ];

        rejectedSheet.getRow(1).font = { bold: true };
        rejectedSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };

        deniedLogs.forEach((log) => {
          rejectedSheet.addRow({
            fecha: format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
            cedula: log.numero_cedula,
            nombre: log.nombre_detectado || '-',
            razon: log.denial_reason || 'No autorizado',
          });
        });
      }

      // ===== Hoja: Resumen (enriched) =====
      const summarySheet = workbook.addWorksheet('Resumen');
      summarySheet.addRow(['Evento:', eventName]);
      summarySheet.addRow(['Total Registros:', registros.length]);
      summarySheet.addRow(['Fecha Exportación:', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })]);
      summarySheet.addRow(['']);
      summarySheet.addRow(['Por Sexo:']);
      summarySheet.addRow(['Masculino:', registros.filter(r => r.sexo === 'M').length]);
      summarySheet.addRow(['Femenino:', registros.filter(r => r.sexo === 'F').length]);
      
      if (autorizadas.length > 0) {
        const registeredCedulas = new Set(registros.map(r => r.numero_cedula));
        const registered = autorizadas.filter(a => registeredCedulas.has(a.numero_cedula)).length;
        summarySheet.addRow(['']);
        summarySheet.addRow(['Lista de Acceso:']);
        summarySheet.addRow(['Total Autorizados:', autorizadas.length]);
        summarySheet.addRow(['Registrados:', registered]);
        summarySheet.addRow(['Pendientes:', autorizadas.length - registered]);
        summarySheet.addRow(['Rechazados:', deniedLogs.length]);
      }

      // Control type totals in summary
      if (controlUsage.length > 0) {
        summarySheet.addRow(['']);
        summarySheet.addRow(['Por Tipo de Control:']);
        const totals = new Map<string, number>();
        controlUsage.forEach(u => {
          const name = getControlName(u.control_type_id);
          totals.set(name, (totals.get(name) || 0) + 1);
        });
        totals.forEach((count, name) => {
          summarySheet.addRow([name + ':', count]);
        });
        summarySheet.addRow(['Total Usos:', controlUsage.length]);
      }

      summarySheet.getColumn(1).font = { bold: true };
      summarySheet.getColumn(1).width = 20;
      summarySheet.getColumn(2).width = 30;

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `registros-cedulas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
      saveAs(blob, filename);
      
      toast.success(`Exportados ${registros.length} registros`);
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error('Error al exportar el archivo');
    }
  };

  return (
    <Button onClick={handleExport} disabled={registros.length === 0} variant="outline">
      <FileDown className="mr-2 h-4 w-4" />
      Exportar Excel ({registros.length})
    </Button>
  );
}
