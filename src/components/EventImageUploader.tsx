import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EventImageUploaderProps {
  eventId: string;
  label: string;
  currentUrl: string | null;
  storagePath: string; // e.g. "logo", "background", "event-image"
  onUpload: (url: string) => void;
  onRemove: () => void;
  accept?: string;
  maxSizeMB?: number;
}

const EventImageUploader: React.FC<EventImageUploaderProps> = ({
  eventId,
  label,
  currentUrl,
  storagePath,
  onUpload,
  onRemove,
  accept = 'image/*',
  maxSizeMB = 5,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({ title: 'Archivo muy grande', description: `Máximo ${maxSizeMB}MB`, variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${eventId}/${storagePath}.${ext}`;

      // Remove old file first
      await supabase.storage.from('event-assets').remove([filePath]);

      const { error } = await supabase.storage
        .from('event-assets')
        .upload(filePath, file, { upsert: true, cacheControl: '60' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('event-assets')
        .getPublicUrl(filePath);

      // Add cache buster
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      onUpload(url);
      toast({ title: 'Imagen subida', description: 'La imagen se actualizó correctamente' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Error al subir', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async () => {
    try {
      // Try to remove from storage
      const paths = ['png', 'jpg', 'jpeg', 'webp'].map(ext => `${eventId}/${storagePath}.${ext}`);
      await supabase.storage.from('event-assets').remove(paths);
    } catch { /* ignore */ }
    onRemove();
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      
      {currentUrl ? (
        <div className="relative group">
          <div className="w-full h-32 rounded-lg border border-border overflow-hidden bg-secondary">
            <img
              src={currentUrl}
              alt={label}
              className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
            />
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`w-full h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Arrastra o haz clic para subir</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Máx {maxSizeMB}MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default EventImageUploader;
