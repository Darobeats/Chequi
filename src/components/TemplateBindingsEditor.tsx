import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useTicketCategories } from '@/hooks/useTicketCategories';
import {
  useTemplateCategoryBindings,
  useSetTemplateBinding,
  useRemoveTemplateBinding,
} from '@/hooks/useTemplateCategoryBindings';
import { Loader2 } from 'lucide-react';

interface Props {
  templateId: string;
  eventId: string | null;
}

const TemplateBindingsEditor: React.FC<Props> = ({ templateId, eventId }) => {
  const { data: categories = [] } = useTicketCategories();
  const { data: bindings = [], isLoading } = useTemplateCategoryBindings(templateId);
  const setBinding = useSetTemplateBinding();
  const removeBinding = useRemoveTemplateBinding();

  const eventCategories = eventId ? categories.filter((c: any) => c.event_id === eventId) : categories;
  const bindingMap = new Map(bindings.map((b) => [b.category_id, b]));

  return (
    <Card className="bg-gray-900/30 border-gray-800">
      <CardHeader>
        <CardTitle className="text-sm text-dorado">Categorías asignadas</CardTitle>
        <CardDescription>
          Al exportar por categoría se usará esta plantilla automáticamente para las categorías marcadas.
          Marca "Por defecto" para usarla como fallback cuando una categoría no tenga plantilla asignada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : eventCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Asigna primero un evento a la plantilla para ver sus categorías.
          </p>
        ) : (
          <div className="space-y-2">
            {eventCategories.map((c: any) => {
              const b = bindingMap.get(c.id);
              const checked = !!b;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded border border-gray-800 p-2"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        if (v) setBinding.mutate({ template_id: templateId, category_id: c.id });
                        else removeBinding.mutate({ template_id: templateId, category_id: c.id });
                      }}
                    />
                    <div
                      className="h-3 w-3 rounded"
                      style={{ backgroundColor: c.color || '#D4AF37' }}
                    />
                    <Label className="text-sm">{c.name}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    {checked && (
                      <>
                        <Checkbox
                          id={`def-${c.id}`}
                          checked={!!b?.is_default}
                          onCheckedChange={(v) =>
                            setBinding.mutate({
                              template_id: templateId,
                              category_id: c.id,
                              is_default: !!v,
                            })
                          }
                        />
                        <Label htmlFor={`def-${c.id}`} className="text-xs text-muted-foreground">
                          Por defecto
                        </Label>
                      </>
                    )}
                    {b?.is_default && <Badge variant="outline">Default</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TemplateBindingsEditor;
