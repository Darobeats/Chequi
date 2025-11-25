import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { CedulaRegistro } from '@/types/cedula';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CedulaExportButtonProps {
  registros: CedulaRegistro[];
  eventName?: string;
}

export function CedulaExportButton({ registros, eventName = 'Evento' }: CedulaExportButtonProps) {
  const handleExport = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Registros de Cédulas');

      // Configurar columnas
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

      // Estilo del encabezado
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4AF37' }
      };

      // Agregar datos
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

      // Agregar hoja de resumen
      const summarySheet = workbook.addWorksheet('Resumen');
      summarySheet.addRow(['Evento:', eventName]);
      summarySheet.addRow(['Total Registros:', registros.length]);
      summarySheet.addRow(['Fecha Exportación:', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })]);
      summarySheet.addRow(['']);
      summarySheet.addRow(['Por Sexo:']);
      summarySheet.addRow(['Masculino:', registros.filter(r => r.sexo === 'M').length]);
      summarySheet.addRow(['Femenino:', registros.filter(r => r.sexo === 'F').length]);

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
