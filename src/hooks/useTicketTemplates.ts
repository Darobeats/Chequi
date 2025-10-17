import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TicketTemplate {
  id: string;
  event_config_id: string | null;
  name: string;
  tickets_per_page: number;
  layout: string;
  show_qr: boolean;
  show_name: boolean;
  show_email: boolean;
  show_category: boolean;
  show_ticket_id: boolean;
  custom_fields: any;
  qr_size: number;
  font_size_name: number;
  font_size_info: number;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  background_image_url: string | null;
  background_opacity: number;
  background_mode: 'tile' | 'cover' | 'contain';
  created_at: string;
  updated_at: string;
}

export const useTicketTemplates = () => {
  return useQuery({
    queryKey: ['ticket_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TicketTemplate[];
    },
  });
};

export const useCreateTicketTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<TicketTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('ticket_templates')
        .insert([template])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_templates'] });
      toast({
        title: 'Plantilla creada',
        description: 'La plantilla de tickets se ha creado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la plantilla',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateTicketTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TicketTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_templates'] });
      toast({
        title: 'Plantilla actualizada',
        description: 'La plantilla de tickets se ha actualizado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la plantilla',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteTicketTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_templates'] });
      toast({
        title: 'Plantilla eliminada',
        description: 'La plantilla de tickets se ha eliminado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la plantilla',
        variant: 'destructive',
      });
    },
  });
};