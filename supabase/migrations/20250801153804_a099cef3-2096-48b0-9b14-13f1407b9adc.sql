-- Hacer el scanner de acceso libre sin autenticación
-- Actualizar políticas para permitir acceso sin autenticación al scanner

-- Agregar política para permitir acceso público al scanner
CREATE POLICY "Public scanner access for control usage"
ON public.control_usage
FOR INSERT
WITH CHECK (true);

-- Permitir acceso público a la función de validación
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
  )
  SELECT 
    CASE 
      WHEN ad.id IS NULL THEN false
      WHEN ad.status != 'valid' THEN false
      WHEN cc.max_uses IS NULL THEN false
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
      WHEN uc.uses >= cc.max_uses THEN 'Límite de usos alcanzado'
      ELSE 'Acceso permitido'
    END as error_message
  FROM attendee_data ad
  FULL OUTER JOIN category_control cc ON true
  FULL OUTER JOIN usage_count uc ON true;
$function$;

-- Función pública para encontrar asistente
CREATE OR REPLACE FUNCTION public.find_attendee_by_ticket_public(ticket_id text)
 RETURNS TABLE(id uuid, ticket_id text, name text, email text, company text, category_id uuid, status text, qr_code text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    a.id,
    a.ticket_id,
    a.name,
    a.email,
    a.company,
    a.category_id,
    a.status,
    a.qr_code,
    a.created_at,
    a.updated_at
  FROM public.attendees a
  WHERE a.qr_code = ticket_id OR a.ticket_id = ticket_id
  LIMIT 1;
$function$;