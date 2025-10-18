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

        // Calculate cell dimensions
        const cellWidth = 30;
        const cellHeight = 40;

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

            const bgImageId = workbook.addImage({
              base64,
              extension: getExtension(template.background_image_url),
            });

            // Apply image based on mode
            if (template.background_mode === 'tile') {
              // Apply in tile mode - one image per ticket (4 times for 2x2)
              for (let idx = 0; idx < Math.min(batch.length, ticketsPerPage); idx++) {
                const row = Math.floor(idx / cols);
                const col = idx % cols;
                
                const startCol = col * 1;
                const startRow = row * 25;
                
                worksheet.addImage(bgImageId, {
                  tl: { col: startCol, row: startRow },
                  ext: { 
                    width: 200,
                    height: 190,
                  },
                  editAs: 'oneCell'
                } as any);
              }
            } else if (template.background_mode === 'cover') {
              // Cover entire sheet
              worksheet.addImage(bgImageId, {
                tl: { col: 0, row: 0 },
                br: { col: cols * 10, row: rows * 25 },
              } as any);
            } else if (template.background_mode === 'contain') {
              // Contain in sheet
              worksheet.addImage(bgImageId, {
                tl: { col: 0, row: 0 },
                ext: {
                  width: cellWidth * cols * 10 * 7.5,
                  height: cellHeight * rows * 25 * 1.33,
                },
              } as any);
            }
          } catch (error) {
            console.error('Error applying background image:', error);
          }
        }

        // Set column widths
        for (let col = 0; col < cols; col++) {
          worksheet.getColumn(col + 1).width = 40;
        }

        // Process each ticket in the batch
        for (let idx = 0; idx < batch.length; idx++) {
          const attendee = batch[idx];
          const row = Math.floor(idx / cols);
          const col = idx % cols;

          const startRow = row * 25 + 1; // Approx 25 rows per ticket
          const startCol = col + 1;

          // Generate QR Code
          if (template.show_qr && attendee.qr_code) {
            try {
              const qrDataURL = await QRCode.toDataURL(attendee.qr_code, {
                width: template.qr_size,
                margin: 1,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                }
              });

              const imageId = workbook.addImage({
                base64: qrDataURL,
                extension: 'png'
              });

              // Add QR to cell
              worksheet.addImage(imageId, {
                tl: { col: (col * 1) + 0.2, row: startRow + 2 },
                ext: { width: template.qr_size * 0.4, height: template.qr_size * 0.4 }
              });
            } catch (error) {
              console.error('Error generating QR for:', attendee.name, error);
            }
          }

          // Add text information below QR
          let currentTextRow = startRow + 8; // Start below QR

          if (template.show_name) {
            const nameCell = worksheet.getCell(currentTextRow, startCol);
            nameCell.value = attendee.name;
            nameCell.font = { 
              size: template.font_size_name, 
              bold: true,
              name: 'Arial'
            };
            nameCell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle',
              wrapText: true
            };
            currentTextRow += 2;
          }

          if (template.show_email && attendee.email) {
            const emailCell = worksheet.getCell(currentTextRow, startCol);
            emailCell.value = attendee.email;
            emailCell.font = { 
              size: template.font_size_info,
              name: 'Arial'
            };
            emailCell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle',
              wrapText: true
            };
            currentTextRow += 2;
          }

          if (template.show_category && attendee.ticket_category) {
            const categoryCell = worksheet.getCell(currentTextRow, startCol);
            categoryCell.value = attendee.ticket_category.name;
            categoryCell.font = { 
              size: template.font_size_info,
              name: 'Arial',
              italic: true
            };
            categoryCell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle'
            };
            currentTextRow += 2;
          }

          if (template.show_ticket_id) {
            const ticketIdCell = worksheet.getCell(currentTextRow, startCol);
            ticketIdCell.value = `ID: ${attendee.ticket_id}`;
            ticketIdCell.font = { 
              size: template.font_size_info - 1,
              name: 'Arial'
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

        // Set row heights
        for (let r = 1; r <= worksheet.rowCount; r++) {
          worksheet.getRow(r).height = 20;
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