import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TicketBackgroundUploaderProps {
  currentImageUrl: string | null;
  onImageUpload: (url: string) => void;
  onImageRemove: () => void;
}

// Storage bucket permite hasta 2MB y solo PNG/JPG/WEBP.
// Convertimos todo (PDF, SVG, GIF, BMP, TIFF, AVIF, HEIC...) a JPG/PNG optimizado.
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_INPUT_MB = 25;

export const TicketBackgroundUploader = ({
  currentImageUrl,
  onImageUpload,
  onImageRemove,
}: TicketBackgroundUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl);
  const { toast } = useToast();

  const canvasToOptimizedBlob = async (
    canvas: HTMLCanvasElement,
    preferPng: boolean,
  ): Promise<{ blob: Blob; ext: 'png' | 'jpg'; mime: string }> => {
    const toBlob = (type: string, quality?: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, quality));

    if (preferPng) {
      const png = await toBlob('image/png');
      if (png && png.size <= MAX_UPLOAD_BYTES) return { blob: png, ext: 'png', mime: 'image/png' };
    }

    // Iterativo: baja calidad y luego escala hasta caber en 2MB.
    const qualities = [0.92, 0.85, 0.78, 0.7, 0.6, 0.5];
    for (const q of qualities) {
      const jpg = await toBlob('image/jpeg', q);
      if (jpg && jpg.size <= MAX_UPLOAD_BYTES) return { blob: jpg, ext: 'jpg', mime: 'image/jpeg' };
    }

    // Reduce dimensiones progresivamente
    let w = canvas.width;
    let h = canvas.height;
    for (const factor of [0.85, 0.7, 0.55, 0.4]) {
      const sw = Math.max(600, Math.round(w * factor));
      const sh = Math.max(600, Math.round(h * factor));
      const c2 = document.createElement('canvas');
      c2.width = sw;
      c2.height = sh;
      c2.getContext('2d')!.drawImage(canvas, 0, 0, sw, sh);
      const jpg = await new Promise<Blob | null>((r) => c2.toBlob((b) => r(b), 'image/jpeg', 0.82));
      if (jpg && jpg.size <= MAX_UPLOAD_BYTES) return { blob: jpg, ext: 'jpg', mime: 'image/jpeg' };
    }

    throw new Error('No se pudo comprimir la imagen bajo 2MB. Intenta con un archivo más simple.');
  };

  const renderPdfFirstPageToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
    const pdfjs: any = await import('pdfjs-dist');
    // @ts-ignore - vite worker url import
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas;
  };

  const imageFileToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('El navegador no puede decodificar este formato (prueba PNG, JPG, WEBP o PDF).'));
        el.src = url;
      });
      // Escala hacia arriba para calidad de impresión si la imagen es pequeña
      const targetMax = 2400;
      const scale = Math.min(1, targetMax / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * (scale < 1 ? 1 : Math.min(1.5, targetMax / img.naturalWidth)));
      const h = Math.round(img.naturalHeight * (w / img.naturalWidth));
      const canvas = document.createElement('canvas');
      canvas.width = w || img.naturalWidth;
      canvas.height = h || img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
    const validExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.bmp', '.tif', '.tiff', '.avif', '.heic', '.heif'];
    const looksValid = isPdf || file.type.startsWith('image/') || validExts.some((e) => name.endsWith(e));

    if (!looksValid) {
      toast({
        title: 'Formato no válido',
        description: 'Usa PDF, PNG, JPG, WEBP, SVG, GIF, BMP, TIFF, AVIF o HEIC',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_INPUT_MB * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: `El archivo debe ser menor a ${MAX_INPUT_MB}MB`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      let canvas: HTMLCanvasElement;
      let preferPng = false;

      if (isPdf) {
        toast({ title: 'Procesando PDF', description: 'Renderizando primera página en alta resolución…' });
        canvas = await renderPdfFirstPageToCanvas(file);
        preferPng = false; // JPG es suficiente para fondos
      } else {
        // Pasar por canvas siempre para convertir a un formato aceptado por el bucket
        canvas = await imageFileToCanvas(file);
        preferPng = /png|svg/.test(file.type) || name.endsWith('.png') || name.endsWith('.svg');
      }

      const { blob, ext, mime } = await canvasToOptimizedBlob(canvas, preferPng);

      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('ticket-backgrounds')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: mime,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ticket-backgrounds')
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onImageUpload(publicUrl);

      toast({
        title: 'Imagen subida',
        description: `Fondo optimizado (${(blob.size / 1024).toFixed(0)} KB) subido correctamente`,
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error al subir imagen',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentImageUrl) return;

    try {
      const urlParts = currentImageUrl.split('/');
      const filePath = urlParts[urlParts.length - 1].split('?')[0];

      const { error } = await supabase.storage
        .from('ticket-backgrounds')
        .remove([filePath]);

      if (error) throw error;

      setPreview(null);
      onImageRemove();

      toast({
        title: 'Imagen eliminada',
        description: 'La imagen de fondo se ha eliminado',
      });
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast({
        title: 'Error al eliminar imagen',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                <img
                  src={preview}
                  alt="Imagen actual del ticket"
                  className="h-full w-full object-contain"
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2"
                onClick={handleRemove}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Arrastra un archivo o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, PNG, JPG, WEBP, SVG, GIF, BMP, TIFF, AVIF, HEIC (entrada máx. 25MB)
            </p>
            <p className="text-xs text-muted-foreground">
              Se optimiza automáticamente en el navegador para calidad de impresión
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <label htmlFor="background-upload">
          <Button
            variant="outline"
            disabled={uploading}
            asChild
            type="button"
          >
            <span className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Procesando…' : preview ? 'Cambiar imagen' : 'Seleccionar archivo'}
            </span>
          </Button>
          <input
            id="background-upload"
            type="file"
            className="hidden"
            accept="application/pdf,image/*,.pdf,.svg,.tif,.tiff,.heic,.heif,.avif,.bmp,.gif"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
};
