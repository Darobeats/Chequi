
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
      // Process attendees data with usage information
      const processedData = await Promise.all(
        attendees.map(async (attendee) => {
          const attendeeUsage = controlUsage.filter(usage => usage.attendee_id === attendee.id);
          const lastUsage = attendeeUsage.length > 0 ? attendeeUsage[0] : null;
          
          const formattedLastUsage = lastUsage 
            ? new Date(lastUsage.used_at).toLocaleString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })
            : 'Sin registros';

          // Generate QR code as base64 image
          let qrImage = '';
          if (attendee.qr_code) {
            try {
              qrImage = await QRCode.toDataURL(attendee.qr_code, {
                width: 128,
                margin: 1,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                }
              });
            } catch (error) {
              console.error('Error generating QR code:', error);
            }
          }

          return {
            'Ticket ID': attendee.ticket_id,
            'Nombre': attendee.name,
            'Empresa': attendee.company || 'N/A',
            'Email': attendee.email || 'N/A',
            'Categoría': attendee.ticket_category?.name || 'N/A',
            'Código QR': attendee.qr_code || 'No generado',
            'QR Visual': qrImage,
            'Último Uso': formattedLastUsage,
            'Total Usos': attendeeUsage.length,
            'Estado': attendee.status === 'valid' ? 'Válido' : 
                     attendee.status === 'used' ? 'Usado' : 'Bloqueado',
          };
        })
      );

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Convert data to worksheet format
      const wsData = processedData.map(row => {
        // Exclude QR Visual from regular data for now
        const { 'QR Visual': qrImage, ...regularData } = row;
        return regularData;
      });

      const ws = XLSX.utils.json_to_sheet(wsData);

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Ticket ID
        { wch: 25 }, // Nombre
        { wch: 20 }, // Empresa
        { wch: 25 }, // Email
        { wch: 12 }, // Categoría
        { wch: 20 }, // Código QR
        { wch: 18 }, // Último Uso
        { wch: 10 }, // Total Usos
        { wch: 10 }, // Estado
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
