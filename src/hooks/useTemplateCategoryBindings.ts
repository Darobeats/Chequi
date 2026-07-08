import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TemplateCategoryBinding {
  id: string;
  template_id: string;
  category_id: string;
  is_default: boolean;
  created_at: string;
}

export const useTemplateCategoryBindings = (templateId?: string) => {
  return useQuery({
    queryKey: ['template_category_bindings', templateId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('ticket_template_category_bindings').select('*');
      if (templateId) q = q.eq('template_id', templateId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TemplateCategoryBinding[];
    },
  });
};

export const useAllTemplateBindings = () => {
  return useQuery({
    queryKey: ['template_category_bindings', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ticket_template_category_bindings').select('*');
      if (error) throw error;
      return (data ?? []) as TemplateCategoryBinding[];
    },
  });
};

export const useSetTemplateBinding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { template_id: string; category_id: string; is_default?: boolean }) => {
      const { data, error } = await supabase
        .from('ticket_template_category_bindings')
        .upsert(
          { template_id: input.template_id, category_id: input.category_id, is_default: input.is_default ?? false },
          { onConflict: 'template_id,category_id' },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template_category_bindings'] });
      toast({ title: 'Asignación guardada' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

export const useRemoveTemplateBinding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { template_id: string; category_id: string }) => {
      const { error } = await supabase
        .from('ticket_template_category_bindings')
        .delete()
        .eq('template_id', input.template_id)
        .eq('category_id', input.category_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template_category_bindings'] });
      toast({ title: 'Asignación eliminada' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};
