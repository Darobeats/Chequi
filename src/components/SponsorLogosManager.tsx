import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Upload, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface SponsorLogo {
  name: string;
  url: string;
  link?: string;
}

interface SponsorLogosManagerProps {
  eventId: string;
  sponsors: SponsorLogo[];
  onChange: (sponsors: SponsorLogo[]) => void;
  maxSponsors?: number;
}

const SponsorLogosManager: React.FC<SponsorLogosManagerProps> = ({
  eventId,
  sponsors,
  onChange,
  maxSponsors = 6,
}) => {
  const [isUploading, setIsUploading] = useState<number | null>(null);
  const { toast } = useToast();

  const addSponsor = () => {
    if (sponsors.length >= maxSponsors) {
      toast({ title: 'Límite alcanzado', description: `Máximo ${maxSponsors} patrocinadores`, variant: 'destructive' });
      return;
    }
    onChange([...sponsors, { name: '', url: '', link: '' }]);
  };

  const removeSponsor = (index: number) => {
    onChange(sponsors.filter((_, i) => i !== index));
  };

  const updateSponsor = (index: number, field: keyof SponsorLogo, value: string) => {
    const updated = [...sponsors];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const uploadSponsorLogo = async (index: number, file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Archivo muy grande', description: 'Máximo 2MB por logo', variant: 'destructive' });
      return;
    }

    setIsUploading(index);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const safeName = (sponsors[index].name || `sponsor_${index}`).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const filePath = `${eventId}/sponsors/${safeName}.${ext}`;

      const { error } = await supabase.storage
        .from('event-assets')
        .upload(filePath, file, { upsert: true, cacheControl: '60' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('event-assets')
        .getPublicUrl(filePath);

      updateSponsor(index, 'url', `${urlData.publicUrl}?t=${Date.now()}`);
      toast({ title: 'Logo subido' });
    } catch (error: any) {
      toast({ title: 'Error al subir', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-foreground font-medium">Logos de Patrocinadores / Organizadores</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={addSponsor}
          disabled={sponsors.length >= maxSponsors}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Plus className="h-3 w-3 mr-1" />
          Agregar ({sponsors.length}/{maxSponsors})
        </Button>
      </div>

      {sponsors.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
          Sin patrocinadores. Agrega logos para que aparezcan en el HUB.
        </p>
      )}

      <div className="space-y-3">
        {sponsors.map((sponsor, index) => (
          <Card key={index} className="bg-secondary/50 border-border">
            <CardContent className="p-3 flex items-start gap-3">
              {/* Logo preview / upload */}
              <div className="w-16 h-16 flex-shrink-0 rounded border border-border overflow-hidden bg-background flex items-center justify-center">
                {sponsor.url ? (
                  <img src={sponsor.url} alt={sponsor.name} className="w-full h-full object-contain" />
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    {isUploading === index ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadSponsorLogo(index, file);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Nombre del patrocinador"
                  value={sponsor.name}
                  onChange={(e) => updateSponsor(index, 'name', e.target.value)}
                  className="h-8 text-xs bg-background border-border"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="https://sitio-web.com (opcional)"
                    value={sponsor.link || ''}
                    onChange={(e) => updateSponsor(index, 'link', e.target.value)}
                    className="h-8 text-xs bg-background border-border"
                  />
                  {sponsor.url && (
                    <label className="cursor-pointer">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                        <span><Upload className="h-3 w-3" /></span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadSponsorLogo(index, file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Remove */}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => removeSponsor(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SponsorLogosManager;
