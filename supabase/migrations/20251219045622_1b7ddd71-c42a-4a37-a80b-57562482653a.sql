-- Create table for tracking consumable usage by cédula
CREATE TABLE public.cedula_control_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.event_configs(id) ON DELETE CASCADE,
  numero_cedula TEXT NOT NULL,
  control_type_id UUID NOT NULL REFERENCES public.control_types(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device TEXT,
  notes TEXT,
  scanned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cedula_control_usage ENABLE ROW LEVEL SECURITY;

-- Policies for cedula_control_usage
CREATE POLICY "Admin and control can manage cedula_control_usage"
ON public.cedula_control_usage
FOR ALL
USING (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role))
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'::user_role) OR user_has_role_secure(auth.uid(), 'control'::user_role));

CREATE POLICY "Scanner can insert cedula_control_usage"
ON public.cedula_control_usage
FOR INSERT
WITH CHECK (user_has_role_secure(auth.uid(), 'scanner'::user_role) AND event_id = get_active_event_id());

CREATE POLICY "Scanner can view cedula_control_usage"
ON public.cedula_control_usage
FOR SELECT
USING (user_has_role_secure(auth.uid(), 'scanner'::user_role) AND event_id = get_active_event_id());

-- Create index for faster lookups
CREATE INDEX idx_cedula_control_usage_lookup 
ON public.cedula_control_usage(event_id, numero_cedula, control_type_id);

-- Create function to check cedula control usage limit
CREATE OR REPLACE FUNCTION public.check_cedula_control_limit(
  p_event_id UUID,
  p_numero_cedula TEXT,
  p_control_type_id UUID
)
RETURNS TABLE(
  can_access BOOLEAN,
  current_uses BIGINT,
  max_uses INTEGER,
  error_message TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH usage_count AS (
    SELECT COUNT(*) as uses
    FROM public.cedula_control_usage
    WHERE event_id = p_event_id 
      AND numero_cedula = p_numero_cedula 
      AND control_type_id = p_control_type_id
  ),
  category_limit AS (
    -- Get limit from cedulas_autorizadas category mapped to ticket_categories
    SELECT COALESCE(cc.max_uses, 1) as max_uses
    FROM public.cedulas_autorizadas ca
    JOIN public.ticket_categories tc ON LOWER(tc.name) = LOWER(ca.categoria)
    JOIN public.category_controls cc ON cc.category_id = tc.id AND cc.control_type_id = p_control_type_id
    WHERE ca.event_id = p_event_id AND ca.numero_cedula = p_numero_cedula
    LIMIT 1
  )
  SELECT 
    CASE 
      WHEN cl.max_uses IS NULL THEN true  -- No limit found, allow
      WHEN uc.uses >= cl.max_uses THEN false
      ELSE true
    END as can_access,
    COALESCE(uc.uses, 0) as current_uses,
    COALESCE(cl.max_uses, 0) as max_uses,
    CASE 
      WHEN cl.max_uses IS NULL THEN 'Sin límite configurado'
      WHEN uc.uses >= cl.max_uses THEN 'Límite de usos alcanzado (' || uc.uses || '/' || cl.max_uses || ')'
      ELSE 'Acceso permitido (' || uc.uses || '/' || cl.max_uses || ')'
    END as error_message
  FROM usage_count uc
  CROSS JOIN (SELECT COALESCE((SELECT max_uses FROM category_limit), NULL) as max_uses) cl;
$$;