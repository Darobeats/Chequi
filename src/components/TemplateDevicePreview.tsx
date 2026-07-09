import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Smartphone, Tablet, Printer, AlertTriangle } from 'lucide-react';
import { Canvas as FabricCanvas, FabricImage, Text } from 'fabric';
import QRCode from 'qrcode';
import { TicketElement } from '@/types/database';

interface TemplateDevicePreviewProps {
  canvasWidth: number;
  canvasHeight: number;
  elements: TicketElement[];
  backgroundImageUrl?: string | null;
  backgroundOpacity?: number;
  backgroundTransform?: any;
}

const DEVICE_FRAMES = {
  mobile: { w: 375, h: 812, label: 'iPhone', icon: Smartphone },
  tablet: { w: 768, h: 1024, label: 'iPad', icon: Tablet },
  print: { w: 794, h: 1123, label: 'A4', icon: Printer },
};

export const TemplateDevicePreview = ({
  canvasWidth, canvasHeight, elements,
  backgroundImageUrl, backgroundOpacity = 0.15, backgroundTransform,
}: TemplateDevicePreviewProps) => {
  const [device, setDevice] = useState<keyof typeof DEVICE_FRAMES>('mobile');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const el = document.createElement('canvas');
      const fc = new FabricCanvas(el, { width: canvasWidth, height: canvasHeight, backgroundColor: '#ffffff' });

      // background
      if (backgroundImageUrl) {
        try {
          const img = await FabricImage.fromURL(backgroundImageUrl, { crossOrigin: 'anonymous' });
          const iw = img.width || 1, ih = img.height || 1;
          const hasT = backgroundTransform && (backgroundTransform.scaleX != null);
          let s = Math.max(canvasWidth / iw, canvasHeight / ih);
          img.set({
            left: hasT ? backgroundTransform.x ?? 0 : (canvasWidth - iw * s) / 2,
            top: hasT ? backgroundTransform.y ?? 0 : (canvasHeight - ih * s) / 2,
            scaleX: hasT ? backgroundTransform.scaleX ?? 1 : s,
            scaleY: hasT ? backgroundTransform.scaleY ?? 1 : s,
            angle: backgroundTransform?.angle ?? 0,
            opacity: backgroundOpacity,
          });
          fc.add(img);
        } catch { /* ignore */ }
      }

      // elements
      for (const e of elements) {
        if (e.type === 'qr') {
          const url = await QRCode.toDataURL('SAMPLE-' + e.id, { width: e.width, margin: 0 });
          const qrImg = await FabricImage.fromURL(url);
          qrImg.set({ left: e.x, top: e.y, scaleX: e.width / (qrImg.width || 1), scaleY: e.height / (qrImg.height || 1) });
          fc.add(qrImg);
        } else if (e.type === 'text') {
          const t = new Text(e.content || 'Texto', {
            left: e.x, top: e.y, fontSize: e.fontSize || 14,
            fontFamily: e.fontFamily || 'Arial', fill: e.color || '#000',
            fontWeight: e.bold ? 'bold' : 'normal',
          });
          fc.add(t);
        }
      }
      fc.renderAll();
      setPreviewSrc(fc.toDataURL({ format: 'png', multiplier: 1 } as any));
      fc.dispose();
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [canvasWidth, canvasHeight, elements, backgroundImageUrl, backgroundOpacity, backgroundTransform]);

  const frame = DEVICE_FRAMES[device];
  const scale = Math.min((frame.w - 40) / canvasWidth, (frame.h - 40) / canvasHeight, 1);
  const qr = elements.find(e => e.type === 'qr');
  const qrOnDevice = qr ? qr.width * scale : 0;
  const qrWarning = qr && qrOnDevice < 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista previa por dispositivo</CardTitle>
        <CardDescription>Cómo se verá el ticket a escala real en cada pantalla.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={device} onValueChange={(v) => setDevice(v as any)}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            {Object.entries(DEVICE_FRAMES).map(([key, f]) => {
              const Icon = f.icon;
              return (
                <TabsTrigger key={key} value={key}>
                  <Icon className="h-4 w-4 mr-1" /> {f.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(DEVICE_FRAMES).map((key) => (
            <TabsContent key={key} value={key} className="mt-4">
              <div className="flex flex-col items-center gap-3">
                {qrWarning && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                    <AlertTriangle className="h-4 w-4" />
                    El QR queda pequeño ({Math.round(qrOnDevice)}px) — recomendado ≥100px para escaneo confiable.
                  </div>
                )}
                <div
                  className="relative border-8 border-foreground/80 rounded-3xl bg-white overflow-hidden shadow-lg flex items-center justify-center"
                  style={{ width: frame.w, height: frame.h, maxWidth: '100%' }}
                >
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt="preview"
                      style={{ width: canvasWidth * scale, height: canvasHeight * scale }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">Generando…</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Escala: {(scale * 100).toFixed(0)}% · Ticket: {canvasWidth}×{canvasHeight}px
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
