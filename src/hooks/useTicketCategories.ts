import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TicketCategory, ControlType } from '@/types/database';

export const useTicketCategories = () => {
  return useQuery({
    queryKey: ['ticket_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as TicketCategory[];
    }
  });
};

export const useCreateTicketCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<TicketCategory, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_categories'] });
    }
  });
};

export const useUpdateTicketCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Partial<TicketCategory> & { id: string }) => {
      const { error } = await supabase
        .from('ticket_categories')
        .update(category)
        .eq('id', category.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_categories'] });
    }
  });
};

export const useDeleteTicketCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('ticket_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket_categories'] });
    }
  });
};

export const useCategoryControls = () => {
  return useQuery({
    queryKey: ['category_controls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_controls')
        .select(`
          *,
          control_type:control_types(*),
          ticket_category:ticket_categories(*)
        `);
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateCategoryControl = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoryControl: { 
      category_id: string; 
      control_type_id: string; 
      max_uses: number; 
    }) => {
      const { error } = await supabase
        .from('category_controls')
        .insert(categoryControl);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_controls'] });
    }
  });
};

export const useUpdateCategoryControl = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      category_id: string; 
      control_type_id: string; 
      max_uses: number; 
    }) => {
      const { error } = await supabase
        .from('category_controls')
        .update({ max_uses: data.max_uses })
        .eq('category_id', data.category_id)
        .eq('control_type_id', data.control_type_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_controls'] });
    }
  });
};

export const useDeleteCategoryControl = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { category_id: string; control_type_id: string }) => {
      const { error } = await supabase
        .from('category_controls')
        .delete()
        .eq('category_id', data.category_id)
        .eq('control_type_id', data.control_type_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_controls'] });
    }
  });
};