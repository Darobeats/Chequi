import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { TicketTemplate, useCreateTicketTemplate, useUpdateTicketTemplate } from '@/hooks/useTicketTemplates';
import { QrCode, Type, Mail, Tag, Hash } from 'lucide-react';

interface TicketTemplateEditorProps {
  template?: TicketTemplate | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const TicketTemplateEditor: React.FC<TicketTemplateEditorProps> = ({ template, onSuccess, onCancel }) => {
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
    custom_fields: []
  });

  const createMutation = useCreateTicketTemplate();
  const updateMutation = useUpdateTicketTemplate();

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
        custom_fields: template.custom_fields || []
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (template) {
        await updateMutation.mutateAsync({ id: template.id, ...formData });
      } else {
        await createMutation.mutateAsync(formData);
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="layout">Distribución</Label>
              <Select
                value={formData.layout}
                onValueChange={(value) => {
                  const ticketsMap: { [key: string]: number } = {
                    '2x2': 4,
                    '3x3': 9,
                    '2x3': 6,
                    '3x2': 6,
                    '1x4': 4
                  };
                  setFormData({ 
                    ...formData, 
                    layout: value,
                    tickets_per_page: ticketsMap[value] || 4
                  });
                }}
              >
                <SelectTrigger id="layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2x2">2x2 (4 tickets)</SelectItem>
                  <SelectItem value="3x3">3x3 (9 tickets)</SelectItem>
                  <SelectItem value="2x3">2x3 (6 tickets)</SelectItem>
                  <SelectItem value="3x2">3x2 (6 tickets)</SelectItem>
                  <SelectItem value="1x4">1x4 (4 tickets)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tickets por Página</Label>
              <Input
                type="number"
                value={formData.tickets_per_page}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campos a Mostrar</CardTitle>
          <CardDescription>Seleccione qué información incluir en cada ticket</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show_qr">Código QR</Label>
            </div>
            <Switch
              id="show_qr"
              checked={formData.show_qr}
              onCheckedChange={(checked) => setFormData({ ...formData, show_qr: checked })}
            />
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
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show_email">Email</Label>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tamaños y Formato</CardTitle>
          <CardDescription>Ajuste los tamaños de los elementos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tamaño del QR: {formData.qr_size}px</Label>
            <Slider
              value={[formData.qr_size]}
              onValueChange={(value) => setFormData({ ...formData, qr_size: value[0] })}
              min={100}
              max={300}
              step={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Tamaño Fuente Nombre: {formData.font_size_name}pt</Label>
            <Slider
              value={[formData.font_size_name]}
              onValueChange={(value) => setFormData({ ...formData, font_size_name: value[0] })}
              min={8}
              max={24}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Tamaño Fuente Info: {formData.font_size_info}pt</Label>
            <Slider
              value={[formData.font_size_info]}
              onValueChange={(value) => setFormData({ ...formData, font_size_info: value[0] })}
              min={6}
              max={16}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Márgenes</CardTitle>
          <CardDescription>Configure los márgenes de impresión (en mm)</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="margin_top">Superior</Label>
            <Input
              id="margin_top"
              type="number"
              value={formData.margin_top}
              onChange={(e) => setFormData({ ...formData, margin_top: parseInt(e.target.value) })}
              min={0}
              max={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="margin_bottom">Inferior</Label>
            <Input
              id="margin_bottom"
              type="number"
              value={formData.margin_bottom}
              onChange={(e) => setFormData({ ...formData, margin_bottom: parseInt(e.target.value) })}
              min={0}
              max={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="margin_left">Izquierdo</Label>
            <Input
              id="margin_left"
              type="number"
              value={formData.margin_left}
              onChange={(e) => setFormData({ ...formData, margin_left: parseInt(e.target.value) })}
              min={0}
              max={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="margin_right">Derecho</Label>
            <Input
              id="margin_right"
              type="number"
              value={formData.margin_right}
              onChange={(e) => setFormData({ ...formData, margin_right: parseInt(e.target.value) })}
              min={0}
              max={50}
            />
          </div>
        </CardContent>
      </Card>

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