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

export const TicketBackgroundUploader = ({
  currentImageUrl,
  onImageUpload,
  onImageRemove,
}: TicketBackgroundUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl);
  const { toast } = useToast();

  const renderPdfFirstPageToBlob = async (file: File): Promise<Blob> => {
    const pdfjs: any = await import('pdfjs-dist');
    // @ts-ignore - vite worker url import
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    // High DPI for print-quality background
    const viewport = page.getViewport({ scale: 3 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo convertir el PDF'))), 'image/png', 1)
    );
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
    const validImageTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
      'image/svg+xml', 'image/gif', 'image/bmp', 'image/tiff',
      'image/avif', 'image/heic', 'image/heif',
    ];
    const validImageExts = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.bmp', '.tif', '.tiff', '.avif', '.heic', '.heif'];
    const isValidImage = validImageTypes.includes(file.type) || validImageExts.some(ext => name.endsWith(ext));

    if (!isPdf && !isValidImage) {
      toast({
        title: "Formato no válido",
        description: "Usa PDF, PNG, JPG, WEBP, SVG, GIF, BMP, TIFF, AVIF o HEIC",
        variant: "destructive",
      });
      return;
    }

    // Límite: 20MB (PDFs y fuentes de alta resolución)
    const maxMB = 20;
    if (file.size > maxMB * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: `El archivo debe ser menor a ${maxMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let uploadBlob: Blob = file;
      let fileExt = (file.name.split('.').pop() || 'png').toLowerCase();

      if (isPdf) {
        toast({ title: "Procesando PDF", description: "Renderizando primera página en alta resolución…" });
        uploadBlob = await renderPdfFirstPageToBlob(file);
        fileExt = 'png';
      }

      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('ticket-backgrounds')
        .upload(filePath, uploadBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: isPdf ? 'image/png' : (file.type || undefined),
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-backgrounds')
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onImageUpload(publicUrl);

      toast({
        title: "Imagen subida",
        description: "La imagen de fondo se ha subido correctamente",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error al subir imagen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentImageUrl) return;

    try {
      // Extraer el path del archivo de la URL
      const urlParts = currentImageUrl.split('/');
      const filePath = urlParts[urlParts.length - 1];

      // Eliminar de Supabase Storage
      const { error } = await supabase.storage
        .from('ticket-backgrounds')
        .remove([filePath]);

      if (error) throw error;

      setPreview(null);
      onImageRemove();

      toast({
        title: "Imagen eliminada",
        description: "La imagen de fondo se ha eliminado",
      });
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast({
        title: "Error al eliminar imagen",
        description: error.message,
        variant: "destructive",
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
                  alt="Vista previa"
                  className="h-full w-full object-cover opacity-20"
                  style={{ filter: 'grayscale(20%)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Efecto de marca de agua (vista previa)
                  </p>
                </div>
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
              Arrastra una imagen o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP (máx. 2MB)
            </p>
            <p className="text-xs text-muted-foreground">
              Recomendado: mínimo 800x800px para calidad de impresión
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
              {uploading ? "Subiendo..." : preview ? "Cambiar imagen" : "Seleccionar imagen"}
            </span>
          </Button>
          <input
            id="background-upload"
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
};
