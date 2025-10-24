import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAttendees } from '@/hooks/useSupabaseData';
import { useTicketTemplates, TicketTemplate } from '@/hooks/useTicketTemplates';
import { Printer, FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import QRCode from 'qrcode';
import { Attendee } from '@/types/database';

const ExportTicketsPrint: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper: apply opacity to a base64-encoded image and return base64 (PNG)
  const applyOpacityToBase64 = async (
    base64: string,
    ext: 'png' | 'jpeg',
    opacity: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = Math.max(0, Math.min(1, opacity ?? 0.15));
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.onerror = (e) => reject(e);
      img.src = `data:image/${ext};base64,${base64}`;
    });
  };

  // Helper: resize image maintaining aspect ratio to fit within bounds
  const getImageDimensions = (
    imgWidth: number,
    imgHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } => {
    const aspectRatio = imgWidth / imgHeight;
    let width = maxWidth;
    let height = maxHeight;

    if (aspectRatio > 1) {
      // Landscape
      height = width / aspectRatio;
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
    } else {
      // Portrait or square
      width = height * aspectRatio;
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
    }

    return { width, height };
  };
 
  const { data: attendees = [] } = useAttendees();
  const { data: templates = [] } = useTicketTemplates();

  const generateTicketExcel = async () => {
    if (!selectedTemplateId) {
      toast.error('Por favor seleccione una plantilla');
      return;
    }

    if (attendees.length === 0) {
      toast.error('No hay asistentes para exportar');
      return;
    }

    setIsGenerating(true);

    try {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (!template) throw new Error('Plantilla no encontrada');

      const workbook = new ExcelJS.Workbook();
      
      // Get layout dimensions
      const [rows, cols] = template.layout.split('x').map(Number);
      const ticketsPerPage = template.tickets_per_page;

      // Process attendees in batches
      for (let i = 0; i < attendees.length; i += ticketsPerPage) {
        const batch = attendees.slice(i, i + ticketsPerPage);
        const sheetName = `Tickets ${Math.floor(i / ticketsPerPage) + 1}`;
        const worksheet = workbook.addWorksheet(sheetName);

        // Configure page setup for printing
        worksheet.pageSetup = {
          paperSize: 9, // A4
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 1,
          margins: {
            top: template.margin_top / 25.4, // Convert mm to inches
            bottom: template.margin_bottom / 25.4,
            left: template.margin_left / 25.4,
            right: template.margin_right / 25.4,
            header: 0,
            footer: 0
          }
        };

        // Calculate cell dimensions (increased for better spacing)
        const cellWidth = 50;
        const cellHeight = 50;

        // Apply background image if configured
        if (template.background_image_url) {
          try {
            const imageResponse = await fetch(template.background_image_url);
            const imageBlob = await imageResponse.blob();
            
            // Convert blob to base64
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
              };
              reader.onerror = reject;
              reader.readAsDataURL(imageBlob);
            });

            // Get image extension
            const getExtension = (url: string): 'png' | 'jpeg' => {
              const ext = url.split('.').pop()?.toLowerCase();
              return ext === 'png' ? 'png' : 'jpeg';
            };

            const ext = getExtension(template.background_image_url);
            const opacity = (template as any).background_opacity ?? 0.15;
            const fadedBase64 = await applyOpacityToBase64(base64, ext, opacity);

            const bgImageId = workbook.addImage({
              base64: fadedBase64,
              extension: 'png',
            });

            // Apply image based on mode maintaining aspect ratio
            if (template.background_mode === 'tile') {
              for (let idx = 0; idx < Math.min(batch.length, ticketsPerPage); idx++) {
                const row = Math.floor(idx / cols);
                const col = idx % cols;

                const startCol = col * 1;
                const startRow = row * 25;

                // Cover ticket area while maintaining aspect ratio
                const img = new Image();
                img.src = `data:image/png;base64,${fadedBase64}`;
                await new Promise(resolve => { img.onload = resolve; });
                
                const ticketWidth = 400; // Approx width in pixels
                const ticketHeight = 550; // Approx height in pixels (25 rows)
                const dims = getImageDimensions(img.width, img.height, ticketWidth, ticketHeight);
                
                // Center the image in the ticket area
                const offsetCol = (ticketWidth - dims.width) / (2 * ticketWidth);
                const offsetRow = (ticketHeight - dims.height) / (2 * (ticketHeight / 25));

                worksheet.addImage(bgImageId, {
                  tl: { col: startCol + offsetCol, row: startRow + offsetRow },
                  ext: { width: dims.width, height: dims.height }
                } as any);
              }
            } else if (template.background_mode === 'cover') {
              // Cover entire sheet maintaining aspect ratio
              const sheetWidth = cellWidth * cols * 7.5;
              const sheetHeight = cellHeight * rows * 25 * 1.33;
              
              const img = new Image();
              img.src = `data:image/png;base64,${fadedBase64}`;
              await new Promise(resolve => { img.onload = resolve; });
              
              const dims = getImageDimensions(img.width, img.height, sheetWidth, sheetHeight);
              
              worksheet.addImage(bgImageId, {
                tl: { col: 0, row: 0 },
                ext: { width: Math.max(dims.width, sheetWidth), height: Math.max(dims.height, sheetHeight) }
              } as any);
            } else if (template.background_mode === 'contain') {
              // Contain in sheet maintaining aspect ratio
              const sheetWidth = cellWidth * cols * 7.5;
              const sheetHeight = cellHeight * rows * 25 * 1.33;
              
              const img = new Image();
              img.src = `data:image/png;base64,${fadedBase64}`;
              await new Promise(resolve => { img.onload = resolve; });
              
              const dims = getImageDimensions(img.width, img.height, sheetWidth, sheetHeight);
              
              worksheet.addImage(bgImageId, {
                tl: { col: 0, row: 0 },
                ext: { width: dims.width, height: dims.height }
              } as any);
            }
          } catch (error) {
            console.error('Error applying background image:', error);
          }
        }

        // Set column widths (wider for better design)
        for (let col = 0; col < cols; col++) {
          worksheet.getColumn(col + 1).width = 50;
        }

        // Process each ticket in the batch
        for (let idx = 0; idx < batch.length; idx++) {
          const attendee = batch[idx];
          const row = Math.floor(idx / cols);
          const col = idx % cols;

          const startRow = row * 25 + 1; // Approx 25 rows per ticket
          const startCol = col + 1;

          // Generate QR Code (larger and centered)
          if (template.show_qr && attendee.qr_code) {
            try {
              const qrSize = Math.max(template.qr_size * 1.2, 200); // Minimum 200px, 20% larger
              const qrDataURL = await QRCode.toDataURL(attendee.qr_code, {
                width: qrSize,
                margin: 2,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                }
              });

              const imageId = workbook.addImage({
                base64: qrDataURL,
                extension: 'png'
              });

              // Center QR code horizontally in the ticket area
              const qrDisplaySize = qrSize * 0.75; // 75% of generated size for display
              worksheet.addImage(imageId, {
                tl: { col: (col * 1) + 0.25, row: startRow + 1 },
                ext: { width: qrDisplaySize, height: qrDisplaySize }
              });
            } catch (error) {
              console.error('Error generating QR for:', attendee.name, error);
            }
          }

          // Add text information below QR with professional spacing
          let currentTextRow = startRow + 11; // Start below QR with more space

          if (template.show_name) {
            const nameCell = worksheet.getCell(currentTextRow, startCol);
            nameCell.value = attendee.name.toUpperCase();
            nameCell.font = { 
              size: Math.max(template.font_size_name + 2, 16), // Larger, minimum 16
              bold: true,
              name: 'Arial',
              color: { argb: 'FF000000' }
            };
            nameCell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle',
              wrapText: true
            };
            currentTextRow += 3; // More space after name
          }

          if ((attendee as any).cedula) {
            const cedulaCell = worksheet.getCell(currentTextRow, startCol);
            cedulaCell.value = (attendee as any).cedula;
            cedulaCell.font = { 
              size: Math.max(template.font_size_info, 11),
              name: 'Arial',
              color: { argb: 'FF333333' }
            };
            cedulaCell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle',
              wrapText: true
            };
            currentTextRow += 2.5; // Spacing after cedula
          }

          if (template.show_category && attendee.ticket_category) {
            const categoryCell = worksheet.getCell(currentTextRow, startCol);
            categoryCell.value = attendee.ticket_category.name.toUpperCase();
            categoryCell.font = { 
              size: Math.max(template.font_size_info + 1, 12),
              name: 'Arial',
              bold: true,
              color: { argb: 'FF666666' }
            };
            categoryCell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle'
            };
            categoryCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' }
            };
            currentTextRow += 2.5;
          }

          if (template.show_ticket_id) {
            const ticketIdCell = worksheet.getCell(currentTextRow, startCol);
            ticketIdCell.value = `TICKET ID: ${attendee.ticket_id}`;
            ticketIdCell.font = { 
              size: Math.max(template.font_size_info - 1, 9),
              name: 'Arial',
              color: { argb: 'FF999999' }
            };
            ticketIdCell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle'
            };
            currentTextRow += 1;
          }

          // Add border around ticket
          const endRow = startRow + 24;
          for (let r = startRow; r <= endRow; r++) {
            const cell = worksheet.getCell(r, startCol);
            cell.border = {
              top: r === startRow ? { style: 'thin' } : undefined,
              bottom: r === endRow ? { style: 'thin' } : undefined,
              left: { style: 'thin' },
              right: { style: 'thin' }
            };
          }
        }

        // Set row heights (taller for better spacing)
        for (let r = 1; r <= worksheet.rowCount; r++) {
          worksheet.getRow(r).height = 22;
        }
      }

      // Generate and download Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tickets-${template.name.replace(/\s+/g, '-')}-${new Date().toISOString().substring(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Tickets generados correctamente', {
        description: `Se han generado ${attendees.length} tickets para impresión.`
      });

      setOpen(false);
    } catch (error) {
      console.error('Error generating tickets:', error);
      toast.error('Error al generar los tickets', {
        description: 'Ocurrió un error al crear el archivo. Inténtalo de nuevo.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Imprimir Tickets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Tickets para Impresión</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template">Seleccionar Plantilla</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Seleccione una plantilla" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.layout} - {template.tickets_per_page} tickets/página)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay plantillas disponibles. Cree una plantilla primero.
              </p>
            )}
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Resumen:</p>
            <ul className="text-sm space-y-1">
              <li>• Total de asistentes: {attendees.length}</li>
              <li>• Plantillas disponibles: {templates.length}</li>
              {selectedTemplateId && (
                <li>
                  • Hojas a generar:{' '}
                  {Math.ceil(
                    attendees.length /
                      (templates.find(t => t.id === selectedTemplateId)?.tickets_per_page || 4)
                  )}
                </li>
              )}
            </ul>
          </div>

          <Button
            onClick={generateTicketExcel}
            disabled={!selectedTemplateId || isGenerating || attendees.length === 0}
            className="w-full"
          >
            {isGenerating ? (
              'Generando...'
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Generar y Descargar Tickets
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportTicketsPrint;