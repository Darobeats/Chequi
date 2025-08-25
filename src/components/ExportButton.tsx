
import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useAttendees, useControlUsage } from '@/hooks/useSupabaseData';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';

const ExportButton: React.FC = () => {
  const { data: attendees = [], isLoading } = useAttendees();
  const { data: controlUsage = [] } = useControlUsage();

  const handleExport = async () => {
    if (isLoading || attendees.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      // Process attendees data with detailed usage information
      const processedData: any[] = [];
      
      for (const attendee of attendees) {
        const attendeeUsage = controlUsage.filter(usage => usage.attendee_id === attendee.id);
        
        // Create QR sharing URL (much shorter than base64)
        const qrShareUrl = attendee.qr_code 
          ? `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(attendee.qr_code)}`
          : 'No generado';

        if (attendeeUsage.length === 0) {
          // Attendee with no usage records
          processedData.push({
            'Nombre': attendee.name,
            'Email': attendee.email || 'N/A',
            'Categoría': attendee.ticket_category?.name || 'N/A',
            'Código QR': qrShareUrl,
            'Estado': attendee.status === 'valid' ? 'Válido' : 
                     attendee.status === 'used' ? 'Usado' : 'Bloqueado',
            'Fecha de Uso': 'Sin registros',
            'Hora de Uso': 'Sin registros',
            'Tipo de Acceso': 'Sin registros',
            'Dispositivo': 'Sin registros',
            'Notas': 'Sin registros'
          });
        } else {
          // Create one row per usage record
          attendeeUsage.forEach((usage) => {
            const usedDate = new Date(usage.used_at);
            processedData.push({
              'Nombre': attendee.name,
              'Email': attendee.email || 'N/A',
              'Categoría': attendee.ticket_category?.name || 'N/A',
              'Código QR': qrShareUrl,
              'Estado': attendee.status === 'valid' ? 'Válido' : 
                       attendee.status === 'used' ? 'Usado' : 'Bloqueado',
              'Fecha de Uso': usedDate.toLocaleDateString('es-ES'),
              'Hora de Uso': usedDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }),
              'Tipo de Acceso': usage.control_type?.name || 'N/A',
              'Dispositivo': usage.device || 'N/A',
              'Notas': usage.notes || 'Sin notas'
            });
          });
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Convert data to worksheet format - QR images are now included directly
      const ws = XLSX.utils.json_to_sheet(processedData);

      // Set column widths
      const columnWidths = [
        { wch: 25 }, // Nombre
        { wch: 25 }, // Email
        { wch: 12 }, // Categoría
        { wch: 45 }, // Código QR (URL más largo)
        { wch: 10 }, // Estado
        { wch: 12 }, // Fecha de Uso
        { wch: 12 }, // Hora de Uso
        { wch: 15 }, // Tipo de Acceso
        { wch: 15 }, // Dispositivo
        { wch: 20 }, // Notas
      ];
      ws['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Asistentes');

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `asistentes-${new Date().toISOString().substring(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Reporte Excel generado correctamente', {
        description: `Se ha descargado el archivo con ${attendees.length} asistentes y sus códigos QR.`
      });
    } catch (error) {
      console.error('Error al generar el reporte:', error);
      toast.error('Error al generar el reporte', {
        description: 'Ocurrió un error al exportar los datos. Inténtalo de nuevo.'
      });
    }
  };
  
  return (
    <Button
      onClick={handleExport}
      className="bg-dorado hover:bg-dorado/90 text-empresarial font-medium"
    >
      Exportar a Excel
    </Button>
  );
};

export default ExportButton;
