import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useAttendees } from '@/hooks/useSupabaseData';
import * as ExcelJS from 'exceljs';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';

const ExportQRDistribution: React.FC = () => {
  const { data: attendees = [], isLoading } = useAttendees();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    if (isLoading || attendees.length === 0) {
      toast.error('No hay asistentes para exportar');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Generando QR codes para distribución...', {
      description: `Procesando 0/${attendees.length} asistentes`
    });

    try {
      // Sort attendees alphabetically by name
      const sortedAttendees = [...attendees].sort((a, b) => 
        a.name.localeCompare(b.name, 'es')
      );

      // Filter out attendees without QR codes
      const attendeesWithQR = sortedAttendees.filter(a => a.qr_code);
      
      if (attendeesWithQR.length === 0) {
        toast.error('No hay asistentes con QR codes generados');
        setIsGenerating(false);
        return;
      }

      if (attendeesWithQR.length < attendees.length) {
        toast.warning(`${attendees.length - attendeesWithQR.length} asistentes sin QR code serán omitidos`);
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('QR Codes');

      // Configure columns with optimal widths
      worksheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Cédula', key: 'cedula', width: 35 },
        { header: 'Categoría', key: 'categoria', width: 20 },
        { header: 'Código QR', key: 'qrImage', width: 30 }
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FF000000' }, size: 12 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4AF37' } // Dorado
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Add borders to header
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      let currentRow = 2;
      const batchSize = 50;

      // Process attendees in batches
      for (let i = 0; i < attendeesWithQR.length; i += batchSize) {
        const batch = attendeesWithQR.slice(i, i + batchSize);
        
        for (const attendee of batch) {
          try {
            // Generate high-resolution QR code
            const qrDataURL = await QRCode.toDataURL(attendee.qr_code, {
              width: 400,
              margin: 2,
              errorCorrectionLevel: 'H',
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });

            // Add image to workbook
            const imageId = workbook.addImage({
              base64: qrDataURL,
              extension: 'png'
            });

            // Add data row
            const row = worksheet.addRow({
              nombre: attendee.name,
              cedula: (attendee as any).cedula || 'N/A',
              categoria: attendee.ticket_category?.name || 'N/A',
              qrImage: '' // Placeholder for image
            });

            // Style data cells
            row.eachCell((cell, colNumber) => {
              cell.alignment = { 
                vertical: 'middle', 
                horizontal: colNumber === 4 ? 'center' : 'left' 
              };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
              };
            });

            // Insert QR image in column D (index 3)
            worksheet.addImage(imageId, {
              tl: { col: 3, row: currentRow - 1 },
              ext: { width: 200, height: 200 }
            });

            // Set row height for QR visibility
            worksheet.getRow(currentRow).height = 160;
            
            currentRow++;
          } catch (error) {
            console.error(`Error processing QR for ${attendee.name}:`, error);
          }
        }

        // Update progress toast
        const processed = Math.min(i + batchSize, attendeesWithQR.length);
        toast.loading('Generando QR codes para distribución...', {
          id: toastId,
          description: `Procesando ${processed}/${attendeesWithQR.length} asistentes`
        });
      }

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // Download file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().substring(0, 10);
      link.setAttribute('href', url);
      link.setAttribute('download', `QR-Distribución-${date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`✅ ${attendeesWithQR.length} QR codes descargados correctamente`, {
        id: toastId,
        description: 'El archivo está listo para compartir con los asistentes'
      });
    } catch (error) {
      console.error('Error generating QR distribution:', error);
      toast.error('Error al generar los QR codes', {
        id: toastId,
        description: 'Ocurrió un error. Por favor intenta de nuevo.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isLoading || isGenerating}
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
    >
      <Download className="mr-2 h-4 w-4" />
      {isGenerating ? 'Generando...' : 'Descargar QRs para Distribución'}
    </Button>
  );
};

export default ExportQRDistribution;
