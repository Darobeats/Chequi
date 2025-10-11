-- Add prerequisite column to control_types
ALTER TABLE public.control_types 
ADD COLUMN requires_control_id UUID REFERENCES public.control_types(id) ON DELETE SET NULL;

-- Create index for optimized prerequisite lookups
CREATE INDEX IF NOT EXISTS idx_control_usage_attendee_control 
ON public.control_usage(attendee_id, control_type_id);

-- Update validate_control_access_public function to include prerequisite validation
CREATE OR REPLACE FUNCTION public.validate_control_access_public(p_ticket_id text, p_control_type_id uuid)
 RETURNS TABLE(can_access boolean, attendee_id uuid, category_id uuid, max_uses integer, current_uses bigint, error_message text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH attendee_data AS (
    SELECT a.id, a.category_id, a.status
    FROM public.attendees a
    WHERE a.qr_code = p_ticket_id OR a.ticket_id = p_ticket_id
    LIMIT 1
  ),
  category_control AS (
    SELECT cc.max_uses
    FROM public.category_controls cc
    JOIN attendee_data ad ON ad.category_id = cc.category_id
    WHERE cc.control_type_id = p_control_type_id
    LIMIT 1
  ),
  usage_count AS (
    SELECT COUNT(*) as uses
    FROM public.control_usage cu
    JOIN attendee_data ad ON ad.id = cu.attendee_id
    WHERE cu.control_type_id = p_control_type_id
  ),
  prerequisite_info AS (
    SELECT 
      ct.requires_control_id,
      req_ct.name as required_control_name
    FROM public.control_types ct
    LEFT JOIN public.control_types req_ct ON req_ct.id = ct.requires_control_id
    WHERE ct.id = p_control_type_id
  ),
  prerequisite_validation AS (
    SELECT 
      CASE 
        WHEN pi.requires_control_id IS NULL THEN true
        WHEN EXISTS (
          SELECT 1 
          FROM public.control_usage cu
          JOIN attendee_data ad ON ad.id = cu.attendee_id
          WHERE cu.control_type_id = pi.requires_control_id
        ) THEN true
        ELSE false
      END as prerequisite_met,
      pi.required_control_name
    FROM prerequisite_info pi
    CROSS JOIN attendee_data ad
  )
  SELECT 
    CASE 
      WHEN ad.id IS NULL THEN false
      WHEN ad.status != 'valid' THEN false
      WHEN cc.max_uses IS NULL THEN false
      WHEN NOT COALESCE(pv.prerequisite_met, true) THEN false
      WHEN uc.uses >= cc.max_uses THEN false
      ELSE true
    END as can_access,
    ad.id as attendee_id,
    ad.category_id,
    COALESCE(cc.max_uses, 0) as max_uses,
    COALESCE(uc.uses, 0) as current_uses,
    CASE 
      WHEN ad.id IS NULL THEN 'Ticket no encontrado'
      WHEN ad.status != 'valid' THEN 'Ticket inválido o bloqueado'
      WHEN cc.max_uses IS NULL THEN 'Control no permitido para esta categoría'
      WHEN NOT COALESCE(pv.prerequisite_met, true) THEN 'Debe registrar primero el control de ' || pv.required_control_name
      WHEN uc.uses >= cc.max_uses THEN 'Límite de usos alcanzado'
      ELSE 'Acceso permitido'
    END as error_message
  FROM attendee_data ad
  FULL OUTER JOIN category_control cc ON true
  FULL OUTER JOIN usage_count uc ON true
  FULL OUTER JOIN prerequisite_validation pv ON true;
$function$;