import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTicketTemplateVersions } from '@/hooks/useTicketTemplateVersions';
import { History, Save, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TemplateVersionsPanelProps {
  templateId: string;
  currentSnapshot: any;
  onRestore: (snapshot: any) => void;
}

export const TemplateVersionsPanel = ({ templateId, currentSnapshot, onRestore }: TemplateVersionsPanelProps) => {
  const { list, create, remove } = useTicketTemplateVersions(templateId);
  const [label, setLabel] = useState('');

  const handleSave = async () => {
    await create.mutateAsync({ snapshot: currentSnapshot, label: label.trim() || undefined });
    setLabel('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" /> Versiones de la Plantilla
        </CardTitle>
        <CardDescription>
          Guarda snapshots del diseño para poder restaurarlos más tarde.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Etiqueta (opcional)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej: Diseño final aprobado" />
          </div>
          <Button type="button" onClick={handleSave} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar versión
          </Button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {list.isLoading && <p className="text-sm text-muted-foreground">Cargando versiones…</p>}
          {list.data?.length === 0 && !list.isLoading && (
            <p className="text-sm text-muted-foreground">Aún no hay versiones guardadas.</p>
          )}
          {list.data?.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  v{v.version_number}{v.label ? ` — ${v.label}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => onRestore(v.snapshot)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Restaurar
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove.mutate(v.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
