import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { TicketTemplate, Attendee } from '@/types/database';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from '@/hooks/use-toast';
import { renderTicket, sanitize } from '@/lib/renderTicket';

interface ExportTicketsPNGProps {
  template: TicketTemplate;
  attendees: Attendee[];
}

export const ExportTicketsPNG = ({ template, attendees }: ExportTicketsPNGProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

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
      if (!ticketsFolder) throw new Error('No se pudo crear la carpeta de tickets');

      for (let i = 0; i < attendees.length; i++) {
        const attendee = attendees[i];
        const imageBlob = await renderTicket(template, attendee);
        const fileName = `${attendee.cedula || 'SinCedula'}_${sanitize(attendee.name)}.png`;
        ticketsFolder.file(fileName, imageBlob);
        setProgress(Math.round(((i + 1) / attendees.length) * 100));
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(zipBlob, `tickets_${sanitize(template.name)}_${timestamp}.zip`);

      toast({
        title: 'Exportación exitosa',
        description: `${attendees.length} tickets exportados en formato PNG`,
      });
    } catch (error: any) {
      console.error('Error en exportación:', error);
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo completar la exportación',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
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
