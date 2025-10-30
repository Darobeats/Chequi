
import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useAttendees, useControlUsage } from '@/hooks/useSupabaseData';
import { useActiveEventConfig } from '@/hooks/useEventConfig';
import * as ExcelJS from 'exceljs';
import QRCode from 'qrcode';

const ExportButton: React.FC = () => {
  const { data: attendees = [], isLoading } = useAttendees();
  const { data: controlUsage = [] } = useControlUsage();
  const { data: event } = useActiveEventConfig();

  const handleExport = async () => {
    if (isLoading || attendees.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      // Calculate statistics
      const uniqueAttendees = new Set(controlUsage.map(u => u.attendee_id));
      const attendedCount = uniqueAttendees.size;
      const noShowCount = attendees.length - attendedCount;
      const attendanceRate = attendees.length > 0 ? (attendedCount / attendees.length * 100).toFixed(1) : '0';

      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      
      // === HOJA 1: RESUMEN EJECUTIVO ===
      const summarySheet = workbook.addWorksheet('RESUMEN');
      summarySheet.columns = [
        { width: 30 },
        { width: 20 }
      ];

      summarySheet.addRow(['REPORTE DE ASISTENCIA', event?.event_name || 'Sin nombre']);
      summarySheet.addRow(['Fecha del evento:', event?.event_date || 'N/A']);
      summarySheet.addRow(['Fecha de generación:', new Date().toLocaleDateString('es-ES')]);
      summarySheet.addRow([]);
      summarySheet.addRow(['=== ESTADÍSTICAS GENERALES ===']);
      summarySheet.addRow(['Tickets emitidos:', attendees.length]);
      summarySheet.addRow(['Asistentes confirmados:', attendedCount]);
      summarySheet.addRow(['No se presentaron:', noShowCount]);
      summarySheet.addRow(['Tasa de asistencia:', `${attendanceRate}%`]);
      summarySheet.addRow([]);
      summarySheet.addRow(['=== DESGLOSE POR CONTROL ===']);

      const controlTypeStats = new Map<string, number>();
      controlUsage.forEach(usage => {
        const controlName = usage.control_type?.name || 'Sin tipo';
        controlTypeStats.set(controlName, (controlTypeStats.get(controlName) || 0) + 1);
      });

      controlTypeStats.forEach((count, controlName) => {
        summarySheet.addRow([`${controlName}:`, count]);
      });

      // Style summary sheet
      summarySheet.getRow(1).font = { size: 16, bold: true };
      summarySheet.getRow(5).font = { bold: true };
      summarySheet.getRow(11).font = { bold: true };

      // === HOJA 2: TODOS LOS ASISTENTES ===
      const worksheet = workbook.addWorksheet('Asistentes');

      // Define columns with attendance status
      worksheet.columns = [
        { header: '¿ASISTIÓ?', key: 'asistio', width: 12 },
        { header: 'Total Usos', key: 'totalUsos', width: 12 },
        { header: 'Nombre', key: 'nombre', width: 25 },
        { header: 'Cédula', key: 'cedula', width: 25 },
        { header: 'Categoría', key: 'categoria', width: 15 },
        { header: 'Código QR URL', key: 'qrUrl', width: 35 },
        { header: 'Imagen QR', key: 'qrImage', width: 25 },
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
            asistio: 'NO',
            totalUsos: 0,
            nombre: attendee.name,
            cedula: attendee.cedula || 'N/A',
            categoria: attendee.ticket_category?.name || 'N/A',
            qrUrl: attendee.qr_code ? 'Ver QR →' : 'No generado',
            qrImage: 'Ver imagen →',
            estado: attendee.status === 'valid' ? 'Válido' : 
                   attendee.status === 'used' ? 'Usado' : 'Bloqueado',
            fechaUso: 'Sin registros',
            horaUso: 'Sin registros',
            tipoAcceso: 'Sin registros',
            dispositivo: 'Sin registros',
            notas: 'Sin registros'
          });

          // Red background for NO ASISTIÓ
          row.getCell('asistio').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' }
          };
          row.getCell('asistio').font = { color: { argb: 'FFFFFFFF' }, bold: true };

          // Set clickable hyperlink for QR URL (uses external API to render QR image)
          if (attendee.qr_code) {
            const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendee.qr_code)}`;
            const cell = row.getCell('qrUrl');
            cell.value = {
              text: 'Ver QR →',
              hyperlink: qrLink,
              tooltip: 'Abrir QR en el navegador'
            };
            cell.font = { color: { argb: 'FF0066CC' }, underline: true };
          }

          // Add QR image if available - positioned correctly in column G (was E)
          if (imageId) {
            worksheet.addImage(imageId, {
              tl: { col: 6, row: currentRow - 1 },
              ext: { width: 120, height: 120 }
            });
          }
          
          currentRow++;
        } else {
          // Create one row per usage record
          attendeeUsage.forEach((usage, index) => {
            const usedDate = new Date(usage.used_at);
            const row = worksheet.addRow({
              asistio: index === 0 ? 'SÍ' : '',
              totalUsos: index === 0 ? attendeeUsage.length : '',
              nombre: attendee.name,
              cedula: attendee.cedula || 'N/A',
              categoria: attendee.ticket_category?.name || 'N/A',
              qrUrl: attendee.qr_code ? (index === 0 ? 'Ver QR →' : '') : 'No generado',
              qrImage: index === 0 ? 'Ver imagen →' : '',
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

            // Green background for SÍ ASISTIÓ (only first row)
            if (index === 0) {
              row.getCell('asistio').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF00FF00' }
              };
              row.getCell('asistio').font = { bold: true };
            }

            // Set QR URL hyperlink only on first row per attendee
            if (attendee.qr_code && index === 0) {
              const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(attendee.qr_code)}`;
              const cell = row.getCell('qrUrl');
              cell.value = {
                text: 'Ver QR →',
                hyperlink: qrLink,
                tooltip: 'Abrir QR en el navegador'
              };
              cell.font = { color: { argb: 'FF0066CC' }, underline: true };
            }

            // Add QR image only on first usage row per attendee
            if (imageId && index === 0) {
              worksheet.addImage(imageId, {
                tl: { col: 6, row: currentRow - 1 },
                ext: { width: 120, height: 120 }
              });
            }
            
            currentRow++;
          });
        }
      }

      // === HOJA 3: NO ASISTIERON ===
      const noShowSheet = workbook.addWorksheet('NO ASISTIERON');
      noShowSheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Cédula', key: 'cedula', width: 20 },
        { header: 'Categoría', key: 'categoria', width: 20 },
        { header: 'Ticket ID', key: 'ticketId', width: 25 },
        { header: 'Estado', key: 'estado', width: 15 }
      ];

      const noShowAttendees = attendees.filter(attendee => 
        !uniqueAttendees.has(attendee.id)
      );

      noShowAttendees.forEach(attendee => {
        noShowSheet.addRow({
          nombre: attendee.name,
          cedula: attendee.cedula || 'N/A',
          categoria: attendee.ticket_category?.name || 'N/A',
          ticketId: attendee.ticket_id,
          estado: attendee.status === 'valid' ? 'Válido' : 
                 attendee.status === 'used' ? 'Usado' : 'Bloqueado'
        });
      });

      // Style headers
      [summarySheet, worksheet, noShowSheet].forEach(sheet => {
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, size: 12 };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD4AF37' }
        };
      });

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
        description: `${attendedCount} de ${attendees.length} asistentes confirmados (${attendanceRate}% de asistencia)`
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
