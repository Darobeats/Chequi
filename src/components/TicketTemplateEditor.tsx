import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { TicketTemplate, TicketElement, useCreateTicketTemplate, useUpdateTicketTemplate } from '@/hooks/useTicketTemplates';
import { TicketBackgroundUploader } from './TicketBackgroundUploader';
import { QrCode, Type, Tag, Hash, Palette } from 'lucide-react';
import { useAllEventConfigs } from '@/hooks/useEventConfig';
import { VisualTicketEditor, type VisualTicketEditorHandle } from './VisualTicketEditor';
import TemplateBindingsEditor from './TemplateBindingsEditor';
import { TicketLivePreview } from './tickets/TicketLivePreview';
import { buildSimpleElements, computeSimpleTicketSize } from '@/lib/ticketFabric';
import { TemplateVersionsPanel } from './TemplateVersionsPanel';

interface TicketTemplateEditorProps {
  template?: TicketTemplate | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const TicketTemplateEditor: React.FC<TicketTemplateEditorProps> = ({ template, onSuccess, onCancel }) => {
  const { data: allEvents = [] } = useAllEventConfigs();
  const [formData, setFormData] = useState({
    name: '',
    tickets_per_page: 4,
    layout: '2x2',
    show_qr: true,
    show_name: true,
    show_email: true,
    show_category: false,
    show_ticket_id: false,
    qr_size: 200,
    font_size_name: 14,
    font_size_info: 10,
    margin_top: 20,
    margin_bottom: 20,
    margin_left: 20,
    margin_right: 20,
    event_config_id: null,
    custom_fields: [],
    background_image_url: null as string | null,
    background_opacity: 0.15,
    background_mode: 'tile' as 'tile' | 'cover' | 'contain' | 'full_ticket',
    background_transform: {} as any,
    canvas_width: 800,
    canvas_height: 600,
    elements: [] as TicketElement[],
    use_visual_editor: false,
  });

  const createMutation = useCreateTicketTemplate();
  const updateMutation = useUpdateTicketTemplate();
  const editorRef = useRef<VisualTicketEditorHandle>(null);
  const elementsRef = useRef<TicketElement[]>([]);
  elementsRef.current = formData.elements;

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        tickets_per_page: template.tickets_per_page,
        layout: template.layout,
        show_qr: template.show_qr,
        show_name: template.show_name,
        show_email: template.show_email,
        show_category: template.show_category,
        show_ticket_id: template.show_ticket_id,
        qr_size: template.qr_size,
        font_size_name: template.font_size_name,
        font_size_info: template.font_size_info,
        margin_top: template.margin_top,
        margin_bottom: template.margin_bottom,
        margin_left: template.margin_left,
        margin_right: template.margin_right,
        event_config_id: template.event_config_id,
        custom_fields: template.custom_fields || [],
        background_image_url: template.background_image_url,
        background_opacity: template.background_opacity,
        background_mode: template.background_mode,
        background_transform: (template as any).background_transform || {},
        canvas_width: template.canvas_width || 800,
        canvas_height: template.canvas_height || 600,
        elements: template.elements || [],
        use_visual_editor: template.use_visual_editor || false,
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Read pending Fabric state directly so save does not depend on stale React state.
    const flushedElements = editorRef.current?.flushToState();
    const sourceElements = flushedElements || elementsRef.current || formData.elements || [];

    // Normalize elements: absorb residual scaleX/scaleY into fontSize/width/height
    // and enforce QR minimum size of 100px.
    const normalizedElements: TicketElement[] = sourceElements.map((el: any) => {
      const sx = el.scaleX ?? 1;
      const sy = el.scaleY ?? 1;
      let out: any = el;
      if (sx !== 1 || sy !== 1) {
        if (el.type === 'text') {
          const base = el.fontSize || 14;
          const nextFontSize = Math.max(4, Math.round(base * sy));
          out = {
            ...el,
            fontSize: nextFontSize,
            width: (el.width || 0) * sx,
            height: (el.height || 0) * sy,
            scaleX: 1,
            scaleY: 1,
          };
        } else {
          out = {
            ...el,
            width: (el.width || 0) * sx,
            height: (el.height || 0) * sy,
            scaleX: 1,
            scaleY: 1,
          };
        }
      } else {
        const { scaleX: _sx, scaleY: _sy, ...rest } = el;
        out = rest;
      }
      if (out.type === 'qr') {
        const qrSize = Math.max(100, Math.round(out.width || 0), Math.round(out.height || 0));
        out.width = qrSize;
        out.height = qrSize;
      }
      return out as TicketElement;
    });

    const isSimple = !formData.use_visual_editor;
    const simpleElements = isSimple ? buildSimpleElements(formData) : null;

    const payload = {
      ...formData,
      canvas_width: isSimple ? computeSimpleTicketSize(formData).width : formData.canvas_width,
      canvas_height: isSimple ? computeSimpleTicketSize(formData).height : formData.canvas_height,
      background_image_url: isSimple ? null : formData.background_image_url,
      show_qr: isSimple ? true : formData.show_qr,
      background_mode: formData.use_visual_editor ? 'full_ticket' as const : formData.background_mode,
      background_opacity: formData.use_visual_editor ? 1 : formData.background_opacity,
      background_transform: formData.use_visual_editor
        ? { x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 }
        : formData.background_transform,
      elements: simpleElements ?? normalizedElements,
    };

    try {
      if (template) {
        await updateMutation.mutateAsync({ id: template.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
          <CardDescription>Configure los detalles generales de la plantilla</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Plantilla</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Plantilla Estándar 2x2"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_config_id">Evento</Label>
            <Select
              value={formData.event_config_id || 'none'}
              onValueChange={(value) => setFormData({ ...formData, event_config_id: value === 'none' ? null : value })}
            >
              <SelectTrigger id="event_config_id">
                <SelectValue placeholder="Selecciona un evento (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin evento específico</SelectItem>
                {allEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.event_name} {event.is_active && '(Activo)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="use_visual_editor" className="text-base font-semibold">
                  Diseño con arte (editor visual)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Actívalo para subir una imagen y ubicar libremente los elementos.
                  Desactivado, se genera un ticket simple con QR sobre fondo blanco.
                </p>
              </div>
            </div>
            <Switch
              id="use_visual_editor"
              checked={formData.use_visual_editor}
              onCheckedChange={(checked) => setFormData({ ...formData, use_visual_editor: checked })}
            />
          </div>

        </CardContent>
      </Card>

      {formData.use_visual_editor ? (
        <>
          <VisualTicketEditor
            ref={editorRef}
            canvasWidth={formData.canvas_width}
            canvasHeight={formData.canvas_height}
            elements={formData.elements}
            backgroundImageUrl={formData.background_image_url}
            backgroundOpacity={formData.background_opacity}
            backgroundTransform={formData.background_transform}
            backgroundMode={formData.background_mode}
            onElementsChange={(elements) => setFormData((prev) => ({ ...prev, elements }))}
            onCanvasSizeChange={(width, height) =>
              setFormData((prev) => ({ ...prev, canvas_width: width, canvas_height: height }))
            }
            onBackgroundTransformChange={(t) => setFormData((prev) => ({ ...prev, background_transform: t }))}
            onBackgroundImageChange={(url) => setFormData((prev) => ({ ...prev, background_image_url: url }))}
          />

          <Card>
            <CardHeader>
              <CardTitle>Imagen de Fondo</CardTitle>
              <CardDescription>La imagen subida define el tamaño completo del ticket y queda fija al 100% del canvas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TicketBackgroundUploader
                currentImageUrl={formData.background_image_url}
                onImageUpload={(url) => setFormData((prev) => ({
                  ...prev,
                  background_image_url: url,
                  background_mode: 'full_ticket',
                  background_opacity: 1,
                  background_transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 },
                }))}
                onImageRemove={() => setFormData((prev) => ({ ...prev, background_image_url: null, background_transform: {} }))}
              />
            </CardContent>
          </Card>
        </>

      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Campos a Mostrar</CardTitle>
              <CardDescription>
                El código QR siempre se incluye. Agrega los datos que necesites.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between opacity-80">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="show_qr">Código QR (obligatorio)</Label>
                </div>
                <Switch id="show_qr" checked disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="show_name">Nombre</Label>
                </div>
                <Switch
                  id="show_name"
                  checked={formData.show_name}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_name: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="show_email">Cédula</Label>
                </div>
                <Switch
                  id="show_email"
                  checked={formData.show_email}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_email: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="show_category">Categoría</Label>
                </div>
                <Switch
                  id="show_category"
                  checked={formData.show_category}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_category: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="show_ticket_id">ID de Ticket</Label>
                </div>
                <Switch
                  id="show_ticket_id"
                  checked={formData.show_ticket_id}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_ticket_id: checked })}
                />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label>Tamaño del QR: {formData.qr_size}px</Label>
                <Slider
                  value={[formData.qr_size]}
                  onValueChange={(value) => setFormData({ ...formData, qr_size: value[0] })}
                  min={100}
                  max={400}
                  step={10}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Ticket</CardTitle>
              <CardDescription>Así se verá el ticket impreso</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <TicketLivePreview
                template={{
                  canvas_width: computeSimpleTicketSize(formData).width,
                  canvas_height: computeSimpleTicketSize(formData).height,
                  background_image_url: null,
                  elements: buildSimpleElements(formData),
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {template && (
        <TemplateBindingsEditor templateId={template.id} eventId={formData.event_config_id} />
      )}

      {template && (
        <TemplateVersionsPanel
          templateId={template.id}
          currentSnapshot={formData}
          onRestore={(snapshot) => setFormData((prev) => ({ ...prev, ...snapshot }))}
        />
      )}




      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando...' : template ? 'Actualizar Plantilla' : 'Crear Plantilla'}
        </Button>
      </div>
    </form>
  );
};

export default TicketTemplateEditor;