import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { renderTicket } from '@/lib/renderTicket';
import { Attendee, TicketTemplate } from '@/types/database';

interface TemplateCompareDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Snapshot dataURL taken from the Fabric editor canvas (what the user sees while editing) */
  editorSnapshot?: string | null;
  /** Template-like object to feed into the export renderer */
  template: TicketTemplate;
  /** When true, only show the export-rendered PNG (no side-by-side) */
  exportOnly?: boolean;
}

const MOCK_ATTENDEE: Attendee = {
  id: 'preview-attendee',
  ticket_id: 'EVT-VIP-ABC1-2024',
  name: 'Juan Pérez',
  cedula: '1234567890',
  category_id: 'preview-cat',
  status: 'valid',
  qr_code: 'SAMPLE-QR-PREVIEW',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  event_id: 'preview-event',
  ticket_category: {
    id: 'preview-cat',
    name: 'VIP',
    description: null,
    color: null,
    created_at: new Date().toISOString(),
    event_id: 'preview-event',
  },
};

export const TemplateCompareDialog = ({
  open,
  onOpenChange,
  editorSnapshot,
  template,
  exportOnly = false,
}: TemplateCompareDialogProps) => {
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    renderTicket(template, MOCK_ATTENDEE)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setExportUrl(objectUrl);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Error al renderizar');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setExportUrl(null);
    };
  }, [open, template]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {exportOnly ? 'Vista previa con motor de exportación' : 'Comparar editor vs. exportación'}
          </DialogTitle>
          <DialogDescription>
            {exportOnly
              ? 'Este PNG se genera con el mismo renderTicket que usa el Centro de Exportación.'
              : 'Izquierda: lo que ves en el editor. Derecha: PNG generado por el motor de exportación (el mismo que descarga el Centro de Exportación).'}
          </DialogDescription>
        </DialogHeader>

        <div className={`grid gap-4 ${exportOnly ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {!exportOnly && (
            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center justify-between">
                <span>Editor (Fabric)</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {template.canvas_width}×{template.canvas_height}
                </span>
              </div>
              <div className="border rounded-md bg-muted/40 overflow-auto max-h-[70vh]">
                {editorSnapshot ? (
                  <img src={editorSnapshot} alt="Snapshot del editor" className="w-full h-auto block" />
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No hay snapshot del editor disponible.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-semibold flex items-center justify-between">
              <span>Motor de exportación (renderTicket)</span>
              <span className="text-xs text-muted-foreground font-mono">
                {template.canvas_width}×{template.canvas_height}
              </span>
            </div>
            <div className="border rounded-md bg-muted/40 overflow-auto max-h-[70vh] min-h-[200px] flex items-center justify-center">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
                  <Loader2 className="h-4 w-4 animate-spin" /> Renderizando...
                </div>
              )}
              {!loading && error && (
                <div className="p-8 text-center text-sm text-destructive">{error}</div>
              )}
              {!loading && !error && exportUrl && (
                <img src={exportUrl} alt="Render del motor de exportación" className="w-full h-auto block" />
              )}
            </div>
          </div>
        </div>

        {!exportOnly && (
          <p className="text-xs text-muted-foreground">
            💡 Si ves diferencias, guarda los cambios primero: la normalización de escalas y el orden de capas se aplican al guardar.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
