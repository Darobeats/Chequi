
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTicketCategories } from '@/hooks/useSupabaseData';
import { useCreateAttendee, useUpdateAttendee } from '@/hooks/useAttendeeManagement';
import { Attendee } from '@/types/database';
import { toast } from '@/components/ui/sonner';

interface AttendeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendee?: Attendee | null;
  onSuccess?: () => void;
}

const AttendeeForm: React.FC<AttendeeFormProps> = ({
  open,
  onOpenChange,
  attendee,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    category_id: '',
    ticket_id: ''
  });

  const { data: categories = [] } = useTicketCategories();
  const createMutation = useCreateAttendee();
  const updateMutation = useUpdateAttendee();

  useEffect(() => {
    if (attendee) {
      setFormData({
        name: attendee.name,
        cedula: (attendee as any).cedula || '',
        category_id: attendee.category_id,
        ticket_id: attendee.ticket_id
      });
    } else {
      setFormData({
        name: '',
        cedula: '',
        category_id: '',
        ticket_id: ''
      });
    }
  }, [attendee, open]);

  const generateTicketId = () => {
    const prefix = 'CLIENT';
    const randomId = Math.random().toString(36).substr(2, 4).toUpperCase();
    const year = new Date().getFullYear();
    return `${prefix}-${randomId}-${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (attendee) {
        await updateMutation.mutateAsync({
          id: attendee.id,
          ...formData
        });
        toast.success('Asistente actualizado correctamente');
      } else {
        await createMutation.mutateAsync({
          ...formData,
          ticket_id: formData.ticket_id || generateTicketId()
        });
        toast.success('Asistente creado correctamente', {
          description: 'Se ha generado automáticamente un código QR único'
        });
      }
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error('Error al guardar el asistente', {
        description: error.message
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-hueso">
        <DialogHeader>
          <DialogTitle className="text-dorado">
            {attendee ? 'Editar Asistente' : 'Crear Nuevo Asistente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-gray-800 border-gray-700"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cedula">Cédula</Label>
            <Input
              id="cedula"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.cedula}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, cedula: value });
              }}
              className="bg-gray-800 border-gray-700"
              placeholder="Solo números"
            />
          </div>


          <div className="space-y-2">
            <Label>Categoría de Ticket *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              required
            >
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="capitalize">{category.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket_id">Ticket ID</Label>
            <Input
              id="ticket_id"
              value={formData.ticket_id}
              onChange={(e) => setFormData({ ...formData, ticket_id: e.target.value })}
              className="bg-gray-800 border-gray-700"
              placeholder="Se generará automáticamente si se deja vacío"
            />
          </div>

          {!attendee && (
            <div className="text-sm text-gray-400 p-3 bg-gray-800/50 rounded">
              <strong>Nota:</strong> Al crear el asistente, se generará automáticamente un código QR único 
              basado en la categoría del ticket seleccionada.
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-dorado text-empresarial hover:bg-dorado/90"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : (attendee ? 'Actualizar' : 'Crear')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AttendeeForm;
