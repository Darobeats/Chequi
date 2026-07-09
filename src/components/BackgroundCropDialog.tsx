import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface BackgroundCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onCropped: (newUrl: string) => void;
}

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

export const BackgroundCropDialog = ({ open, onOpenChange, imageUrl, onCropped }: BackgroundCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((_c: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const handleAccept = async () => {
    if (!croppedArea) return;
    try {
      setUploading(true);
      const blob = await getCroppedBlob(imageUrl, croppedArea);
      const file = new File([blob], `crop-${Date.now()}.png`, { type: 'image/png' });
      const path = `crops/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const { error } = await supabase.storage.from('ticket-backgrounds').upload(path, file, {
        contentType: 'image/png', upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('ticket-backgrounds').getPublicUrl(path);
      onCropped(data.publicUrl);
      toast({ title: 'Imagen recortada', description: 'El nuevo fondo se aplicó al ticket.' });
    } catch (err: any) {
      toast({ title: 'Error al recortar', description: err.message || 'No se pudo procesar la imagen', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Recortar imagen de fondo</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[400px] bg-muted rounded-md overflow-hidden">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            restrictPosition={false}
          />
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Zoom: {zoom.toFixed(2)}x</Label>
            <Slider value={[zoom]} onValueChange={(v) => setZoom(v[0])} min={0.5} max={4} step={0.05} />
          </div>
          <div>
            <Label className="text-xs">Rotación: {rotation}°</Label>
            <Slider value={[rotation]} onValueChange={(v) => setRotation(v[0])} min={-180} max={180} step={1} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Cancelar</Button>
          <Button type="button" onClick={handleAccept} disabled={uploading || !croppedArea}>
            {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aplicar recorte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
