
import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useAttendees, useControlUsage } from '@/hooks/useSupabaseData';
import * as ExcelJS from 'exceljs';
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
      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Asistentes');

      // Define columns with better width for QR images
      worksheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 25 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Categoría', key: 'categoria', width: 15 },
        { header: 'Código QR URL', key: 'qrUrl', width: 35 },
        { header: 'Imagen QR', key: 'qrImage', width: 25 }, // Increased width for images
        { header: 'Estado', key: 'estado', width: 12 },
        { header: 'Fecha de Uso', key: 'fechaUso', width: 15 },
        { header: 'Hora de Uso', key: 'horaUso', width: 15 },
        { header: 'Tipo de Acceso', key: 'tipoAcceso', width: 18 },
        { header: 'Dispositivo', key: 'dispositivo', width: 15 },
        { header: 'Notas', key: 'notas', width: 20 }
      ];

      let currentRow = 2; // Starting from row 2 (after headers)

      for (const attendee of attendees) {
        const attendeeUsage = controlUsage.filter(usage => usage.attendee_id === attendee.id);
        
        // Generate QR code image using browser-compatible method
        let imageId: number | null = null;
        if (attendee.qr_code) {
          try {
            // Generate QR as base64 dataURL - browser compatible
            const qrDataURL = await QRCode.toDataURL(attendee.qr_code, {
              width: 300, // Higher resolution for better print quality
              margin: 1,  // Same as QRCodeDisplay
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });

            // Add image to workbook once per attendee using base64 data URL (browser-safe)
            imageId = workbook.addImage({
              base64: qrDataURL,
              extension: 'png'
            });
          } catch (error) {
            console.error('Error generating QR image for attendee:', attendee.name, error);
          }
        }

        if (attendeeUsage.length === 0) {
          // Attendee with no usage records
          const row = worksheet.addRow({
            nombre: attendee.name,
            email: attendee.email || 'N/A',
            categoria: attendee.ticket_category?.name || 'N/A',
            qrUrl: attendee.qr_code ? 'Ver QR →' : 'No generado',
            qrImage: 'Ver imagen →', // Placeholder text
            estado: attendee.status === 'valid' ? 'Válido' : 
                   attendee.status === 'used' ? 'Usado' : 'Bloqueado',
            fechaUso: 'Sin registros',
            horaUso: 'Sin registros',
            tipoAcceso: 'Sin registros',
            dispositivo: 'Sin registros',
            notas: 'Sin registros'
          });

          // Set clickable hyperlink for QR URL (uses external API to render QR image)
          if (attendee.qr_code) {
            const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendee.qr_code)}`;
            const cell = row.getCell('qrUrl');
            cell.value = { text: 'Ver QR →', hyperlink: qrLink, tooltip: 'Abrir QR en el navegador' } as any;
          }

          // Add QR image if available - positioned correctly in column E
          if (imageId) {
            worksheet.addImage(imageId, {
              tl: { col: 4, row: currentRow - 1 }, // Column E (0-indexed), current row
              ext: { width: 120, height: 120 } // Size of the image
            });
          }
          
          currentRow++;
        } else {
          // Create one row per usage record
          attendeeUsage.forEach((usage, index) => {
            const usedDate = new Date(usage.used_at);
            const row = worksheet.addRow({
              nombre: attendee.name,
              email: attendee.email || 'N/A',
              categoria: attendee.ticket_category?.name || 'N/A',
              qrUrl: attendee.qr_code ? (index === 0 ? 'Ver QR →' : '') : 'No generado',
              qrImage: index === 0 ? 'Ver imagen →' : '', // Only show on first row per attendee
              estado: attendee.status === 'valid' ? 'Válido' : 
                     attendee.status === 'used' ? 'Usado' : 'Bloqueado',
              fechaUso: usedDate.toLocaleDateString('es-ES'),
              horaUso: usedDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }),
              tipoAcceso: usage.control_type?.name || 'N/A',
              dispositivo: usage.device || 'N/A',
              notas: usage.notes || 'Sin notas'
            });

            // Set QR URL hyperlink only on first row per attendee
            if (attendee.qr_code && index === 0) {
              const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendee.qr_code)}`;
              const cell = row.getCell('qrUrl');
              cell.value = { text: 'Ver QR →', hyperlink: qrLink, tooltip: 'Abrir QR en el navegador' } as any;
            }

            // Add QR image only on first usage row per attendee
            if (imageId && index === 0) {
              worksheet.addImage(imageId, {
                tl: { col: 4, row: currentRow - 1 }, // Column E (0-indexed), current row
                ext: { width: 120, height: 120 } // Size of the image
              });
            }
            
            currentRow++;
          });
        }
      }

      // Set row heights for better QR image display
      for (let i = 2; i <= currentRow; i++) {
        worksheet.getRow(i).height = 110; // Increased height for proper QR image display
      }

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
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
