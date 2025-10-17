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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato no válido",
        description: "Por favor sube una imagen PNG, JPG o WEBP",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "La imagen debe ser menor a 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Crear un nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Subir a Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('ticket-backgrounds')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
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
