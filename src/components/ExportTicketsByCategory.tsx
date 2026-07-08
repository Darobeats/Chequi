import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import { Attendee, TicketTemplate } from '@/types/database';
import { useTicketTemplates } from '@/hooks/useTicketTemplates';
import { useAllTemplateBindings } from '@/hooks/useTemplateCategoryBindings';

interface Props {
  eventId: string;
  attendees: Attendee[];
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

const sanitize = (s: string) =>
  (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'sin_categoria';

const getFieldValue = (a: Attendee, field?: string) => {
  switch (field) {
    case 'name': return a.name;
    case 'ticket_id': return a.ticket_id;
    case 'category': return a.ticket_category?.name || 'N/A';
    case 'cedula': return a.cedula ? `Cc ${a.cedula}` : 'N/A';
    case 'email': return 'N/A';
    default: return '';
  }
};

async function renderTicket(template: TicketTemplate, attendee: Attendee): Promise<Blob> {
  const canvas = document.createElement('canvas');
  let cw = template.canvas_width || 800;
  let ch = template.canvas_height || 600;
  let bgImage: HTMLImageElement | null = null;
  if (template.background_image_url) {
    try { bgImage = await loadImage(template.background_image_url); } catch { /* noop */ }
  }
  if (bgImage && template.background_mode === 'full_ticket') {
    cw = bgImage.naturalWidth || bgImage.width;
    ch = bgImage.naturalHeight || bgImage.height;
  }
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);

  if (bgImage) {
    const t: any = (template as any).background_transform || {};
    ctx.globalAlpha = typeof t.opacity === 'number' ? t.opacity : (template.background_opacity ?? 0.15);
    if (template.background_mode === 'tile') {
      const p = ctx.createPattern(bgImage, 'repeat');
      if (p) { ctx.fillStyle = p; ctx.fillRect(0, 0, cw, ch); }
    } else {
      let scaleX = t.scaleX, scaleY = t.scaleY, x = t.x, y = t.y;
      const bw = bgImage.width, bh = bgImage.height;
      if (scaleX == null || scaleY == null) {
        const s = template.background_mode === 'contain'
          ? Math.min(cw / bw, ch / bh)
          : Math.max(cw / bw, ch / bh);
        scaleX = s; scaleY = s;
        x = (cw - bw * s) / 2; y = (ch - bh * s) / 2;
      }
      const angle = t.angle || 0;
      if (angle) {
        const centerX = (x ?? 0) + (bw * scaleX) / 2;
        const centerY = (y ?? 0) + (bh * scaleY) / 2;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(bgImage, -(bw * scaleX) / 2, -(bh * scaleY) / 2, bw * scaleX, bh * scaleY);
        ctx.restore();
      } else {
        ctx.drawImage(bgImage, x ?? 0, y ?? 0, bw * scaleX, bh * scaleY);
      }
    }
    ctx.globalAlpha = 1;
  }

  for (const el of template.elements || []) {
    if (el.type === 'qr') {
      const data = attendee.qr_code || attendee.ticket_id;
      const url = await QRCode.toDataURL(data, { width: el.width, margin: 0, errorCorrectionLevel: 'M' });
      const img = await loadImage(url);
      ctx.drawImage(img, el.x, el.y, el.width, el.height);
    } else if (el.type === 'text') {
      ctx.font = `${el.bold ? 'bold' : 'normal'} ${el.fontSize || 14}px ${el.fontFamily || 'Arial'}`;
      ctx.fillStyle = el.color || '#000000';
      ctx.textAlign = (el.textAlign || 'left') as CanvasTextAlign;
      const text = getFieldValue(attendee, el.field);
      const tx = el.textAlign === 'center'
        ? el.x + el.width / 2
        : el.textAlign === 'right' ? el.x + el.width : el.x;
      ctx.fillText(text, tx, el.y + (el.fontSize || 14));
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('blob null')), 'image/png', 1.0);
  });
}

const ExportTicketsByCategory: React.FC<Props> = ({ eventId, attendees }) => {
  const { data: templates = [] } = useTicketTemplates();
  const { data: bindings = [] } = useAllTemplateBindings();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  // Only visual-editor templates that belong to this event
  const eventTemplates = useMemo(
    () => templates.filter((t) => t.event_config_id === eventId && t.use_visual_editor && (t.elements?.length ?? 0) > 0),
    [templates, eventId],
  );

  const defaultTemplate = useMemo(() => {
    const bDef = bindings.find((b) => b.is_default && eventTemplates.some((t) => t.id === b.template_id));
    return bDef ? eventTemplates.find((t) => t.id === bDef.template_id) : eventTemplates[0];
  }, [bindings, eventTemplates]);

  const resolveTemplate = (categoryId: string): TicketTemplate | undefined => {
    const b = bindings.find((b) => b.category_id === categoryId);
    if (b) return eventTemplates.find((t) => t.id === b.template_id);
    return defaultTemplate;
  };

  const handleExport = async () => {
    if (attendees.length === 0) { toast({ title: 'Sin asistentes', variant: 'destructive' }); return; }
    if (eventTemplates.length === 0) { toast({ title: 'No hay plantillas visuales para este evento', variant: 'destructive' }); return; }

    setBusy(true); setProgress(0);
    try {
      const zip = new JSZip();
      const skipped: string[] = [];
      for (let i = 0; i < attendees.length; i++) {
        const a = attendees[i];
        const tpl = resolveTemplate(a.category_id);
        if (!tpl) { skipped.push(a.name); continue; }
        try {
          const blob = await renderTicket(tpl, a);
          const catFolder = sanitize(a.ticket_category?.name || 'sin_categoria');
          const fname = `${a.cedula || 'SinCedula'}_${sanitize(a.name)}.png`;
          zip.folder(catFolder)!.file(fname, blob);
        } catch (e) { console.error('render error', a.id, e); }
        setProgress(Math.round(((i + 1) / attendees.length) * 100));
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const ts = new Date().toISOString().split('T')[0];
      saveAs(zipBlob, `tickets_por_categoria_${ts}.zip`);
      toast({
        title: 'Exportación completa',
        description: skipped.length
          ? `${attendees.length - skipped.length} tickets generados. ${skipped.length} omitidos (sin plantilla asignada).`
          : `${attendees.length} tickets generados en subcarpetas por categoría.`,
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'No se pudo generar', variant: 'destructive' });
    } finally {
      setBusy(false); setProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleExport}
        disabled={busy || eventTemplates.length === 0}
        className="w-full bg-dorado text-empresarial hover:bg-dorado/90"
      >
        {busy ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando… {progress}%</>
        ) : (
          <><Package className="h-4 w-4 mr-2" /> Exportar {attendees.length} tickets por categoría (ZIP)</>
        )}
      </Button>
      {busy && (
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Usa la plantilla asignada a cada categoría; si no hay, cae al Default o a la primera plantilla del evento.
      </p>
    </div>
  );
};

export default ExportTicketsByCategory;
