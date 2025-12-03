import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { CedulaRegistro, CedulaAutorizada, CedulaAccessLog } from '@/types/cedula';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CedulaExportButtonProps {
  registros: CedulaRegistro[];
  eventName?: string;
  autorizadas?: CedulaAutorizada[];
  accessLogs?: CedulaAccessLog[];
}

export function CedulaExportButton({ 
  registros, 
  eventName = 'Evento',
  autorizadas = [],
  accessLogs = []
}: CedulaExportButtonProps) {
  const handleExport = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Hoja de Registros
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
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4AF37' }
      };

      registros.forEach((registro) => {
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
          fechaRegistro: format(new Date(registro.scanned_at), 'dd/MM/yyyy HH:mm', { locale: es })
        });
      });

      // Hoja de Lista de Acceso (si hay autorizadas)
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
        whitelistSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF3B82F6' }
        };

        autorizadas.forEach((autorizada) => {
          const registro = registros.find(r => r.numero_cedula === autorizada.numero_cedula);
          const isRegistered = registeredCedulas.has(autorizada.numero_cedula);
          
          whitelistSheet.addRow({
            cedula: autorizada.numero_cedula,
            nombre: autorizada.nombre_completo || '-',
            categoria: autorizada.categoria || '-',
            empresa: autorizada.empresa || '-',
            estado: isRegistered ? '✓ Registrado' : '○ Pendiente',
            horaRegistro: registro 
              ? format(new Date(registro.scanned_at), 'dd/MM/yyyy HH:mm', { locale: es })
              : '-',
          });
        });
      }

      // Hoja de Rechazados (si hay logs)
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
        rejectedSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEF4444' }
        };

        deniedLogs.forEach((log) => {
          rejectedSheet.addRow({
            fecha: format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
            cedula: log.numero_cedula,
            nombre: log.nombre_detectado || '-',
            razon: log.denial_reason || 'No autorizado',
          });
        });
      }

      // Hoja de Resumen
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

      summarySheet.getColumn(1).font = { bold: true };
      summarySheet.getColumn(1).width = 20;
      summarySheet.getColumn(2).width = 30;

      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const filename = `registros-cedulas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
      saveAs(blob, filename);
      
      toast.success(`Exportados ${registros.length} registros`);
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error('Error al exportar el archivo');
    }
  };

  return (
    <Button 
      onClick={handleExport}
      disabled={registros.length === 0}
      variant="outline"
    >
      <FileDown className="mr-2 h-4 w-4" />
      Exportar Excel ({registros.length})
    </Button>
  );
}
