import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { renderTicketDataUrl } from '@/lib/renderTicket';
import type { Attendee, TicketTemplate } from '@/types/database';

interface TicketLivePreviewProps {
  /** Partial template: only the render-relevant fields are needed. */
  template: Partial<TicketTemplate>;
}

const SAMPLE_ATTENDEE: Attendee = {
  id: 'preview',
  ticket_id: 'EVT-VIP-ABC1-2026',
  name: 'Juan Pérez',
  cedula: '1234567890',
  category_id: 'preview',
  status: 'valid',
  qr_code: 'EVT-VIP-ABC1-2026',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  event_id: 'preview',
  ticket_category: {
    id: 'preview',
    name: 'General',
    description: null,
    color: null,
    created_at: new Date().toISOString(),
    event_id: 'preview',
  },
};

/**
 * Renders the ticket with the exact same engine used by the export center,
 * so this preview is byte-for-byte what the attendee will receive.
 */
export const TicketLivePreview = ({ template }: TicketLivePreviewProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify({
    w: template.canvas_width,
    h: template.canvas_height,
    bg: template.background_image_url,
    els: template.elements,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    renderTicketDataUrl(template as TicketTemplate, SAMPLE_ATTENDEE)
      .then((dataUrl) => { if (!cancelled) setUrl(dataUrl); })
      .catch((e) => { if (!cancelled) setError(e?.message || 'No se pudo generar la vista previa'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-muted/30 p-3">
        {url && (
          <img
            src={url}
            alt="Vista previa del ticket que se va a imprimir"
            className="w-full h-auto rounded shadow-sm"
          />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !url && (
          <p className="text-sm text-destructive text-center py-8">{error}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Esta es exactamente la imagen que se descarga desde el Centro de Exportación.
      </p>
    </div>
  );
};
