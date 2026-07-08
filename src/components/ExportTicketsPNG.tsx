import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { TicketTemplate, TicketElement, Attendee } from '@/types/database';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import { toast } from '@/hooks/use-toast';

interface ExportTicketsPNGProps {
  template: TicketTemplate;
  attendees: Attendee[];
}

export const ExportTicketsPNG = ({ template, attendees }: ExportTicketsPNGProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const getFieldValue = (attendee: Attendee, field?: string) => {
    switch (field) {
      case 'name': return attendee.name;
      case 'email': return 'N/A'; // Email not in attendees table
      case 'ticket_id': return attendee.ticket_id;
      case 'category': return attendee.ticket_category?.name || 'N/A';
      case 'cedula': return attendee.cedula ? `Cc ${attendee.cedula}` : 'N/A';
      default: return '';
    }
  };

  const generateTicketImage = async (attendee: Attendee): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    let cw = template.canvas_width || 800;
    let ch = template.canvas_height || 600;

    // full_ticket: canvas adopts the image's native dimensions for max fidelity
    let bgImage: HTMLImageElement | null = null;
    if (template.background_image_url) {
      try { bgImage = await loadImage(template.background_image_url); } catch (e) { console.error(e); }
    }
    if (bgImage && template.background_mode === 'full_ticket') {
      cw = bgImage.naturalWidth || bgImage.width;
      ch = bgImage.naturalHeight || bgImage.height;
    }

    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener el contexto del canvas');

    ctx.imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (bgImage) {
      const t = (template as any).background_transform || {};
      ctx.globalAlpha = (typeof t.opacity === 'number' ? t.opacity : (template.background_opacity ?? 0.15));

      if (template.background_mode === 'tile') {
        const pattern = ctx.createPattern(bgImage, 'repeat');
        if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      } else {
        // cover / contain / full_ticket — respect stored transform if present, otherwise auto-fit
        let scaleX = t.scaleX;
        let scaleY = t.scaleY;
        let x = t.x;
        let y = t.y;
        const angle = t.angle || 0;
        const bw = bgImage.width, bh = bgImage.height;

        if (scaleX == null || scaleY == null) {
          if (template.background_mode === 'contain') {
            const s = Math.min(canvas.width / bw, canvas.height / bh);
            scaleX = s; scaleY = s;
            x = (canvas.width - bw * s) / 2;
            y = (canvas.height - bh * s) / 2;
          } else {
            // cover or full_ticket → cover
            const s = Math.max(canvas.width / bw, canvas.height / bh);
            scaleX = s; scaleY = s;
            x = (canvas.width - bw * s) / 2;
            y = (canvas.height - bh * s) / 2;
          }
        }

        if (angle) {
          const cx = (x ?? 0) + (bw * scaleX) / 2;
          const cy = (y ?? 0) + (bh * scaleY) / 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.drawImage(bgImage, -(bw * scaleX) / 2, -(bh * scaleY) / 2, bw * scaleX, bh * scaleY);
          ctx.restore();
        } else {
          ctx.drawImage(bgImage, x ?? 0, y ?? 0, bw * scaleX, bh * scaleY);
        }
      }
      ctx.globalAlpha = 1;
    }


    // Draw elements
    const elements = template.elements || [];
    
    for (const element of elements) {
      if (element.type === 'qr') {
        // Generate QR code for this attendee
        const qrData = attendee.qr_code || attendee.ticket_id;
        const qrDataUrl = await QRCode.toDataURL(qrData, {
          width: element.width,
          margin: 0,
          errorCorrectionLevel: 'M',
        });
        const qrImage = await loadImage(qrDataUrl);
        ctx.drawImage(qrImage, element.x, element.y, element.width, element.height);
      } else if (element.type === 'text') {
        const text = getFieldValue(attendee, element.field);
        
        ctx.font = `${element.bold ? 'bold' : 'normal'} ${element.fontSize || 14}px ${element.fontFamily || 'Arial'}`;
        ctx.fillStyle = element.color || '#000000';
        ctx.textAlign = (element.textAlign || 'left') as CanvasTextAlign;
        
        const textX = element.textAlign === 'center' 
          ? element.x + element.width / 2 
          : element.textAlign === 'right'
          ? element.x + element.width
          : element.x;
        
        ctx.fillText(text, textX, element.y + (element.fontSize || 14));
      }
    }

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png', 1.0);
    });
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleExport = async () => {
    if (!template.use_visual_editor || !template.elements || template.elements.length === 0) {
      toast({
        title: 'Error',
        description: 'Esta plantilla no tiene configuración visual. Usa el editor visual primero.',
        variant: 'destructive',
      });
      return;
    }

    if (attendees.length === 0) {
      toast({
        title: 'Error',
        description: 'No hay asistentes para exportar',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const ticketsFolder = zip.folder('tickets');

      if (!ticketsFolder) {
        throw new Error('No se pudo crear la carpeta de tickets');
      }

      // Generate images for each attendee
      for (let i = 0; i < attendees.length; i++) {
        const attendee = attendees[i];
        
        try {
          const imageBlob = await generateTicketImage(attendee);
          const fileName = `${attendee.cedula || 'SinCedula'}_${sanitizeFilename(attendee.name)}.png`;
          ticketsFolder.file(fileName, imageBlob);
          
          setProgress(Math.round(((i + 1) / attendees.length) * 100));
        } catch (error) {
          console.error(`Error generando ticket para ${attendee.name}:`, error);
        }
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Download ZIP
      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(zipBlob, `tickets_${template.name}_${timestamp}.zip`);

      toast({
        title: 'Exportación exitosa',
        description: `${attendees.length} tickets exportados en formato PNG`,
      });
    } catch (error) {
      console.error('Error en exportación:', error);
      toast({
        title: 'Error',
        description: 'No se pudo completar la exportación',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const sanitizeFilename = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  return (
    <div>
      <Button
        onClick={handleExport}
        disabled={isExporting || attendees.length === 0}
        className="w-full"
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exportando... {progress}%
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Exportar {attendees.length} Tickets como PNG (ZIP)
          </>
        )}
      </Button>
      {isExporting && (
        <div className="mt-2 w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
