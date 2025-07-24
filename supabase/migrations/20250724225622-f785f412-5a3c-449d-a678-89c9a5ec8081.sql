-- Crear usuario de control por defecto para testing del scanner
-- Primero necesitamos insertar un usuario en auth.users pero como no podemos acceder directamente,
-- vamos a crear una función que maneje esto correctamente

-- Actualizar políticas RLS para asegurar acceso correcto del scanner
-- Verificar que usuarios con rol 'control' puedan acceder a attendees

-- Política para permitir a usuarios control ver todos los attendees
DROP POLICY IF EXISTS "Control users can view all attendees" ON public.attendees;
CREATE POLICY "Control users can view all attendees" 
ON public.attendees 
FOR SELECT 
USING (get_current_user_role() = 'control'::user_role);

-- Política para permitir a usuarios control insertar en control_usage
DROP POLICY IF EXISTS "Control users can insert usage" ON public.control_usage;
CREATE POLICY "Control users can insert usage" 
ON public.control_usage 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'control'::user_role);

-- Función para buscar attendee por ticket_id (necesaria para el scanner)
CREATE OR REPLACE FUNCTION public.find_attendee_by_ticket(ticket_id text)
RETURNS TABLE (
  id uuid,
  ticket_id text,
  name text,
  email text,
  company text,
  category_id uuid,
  status text,
  qr_code text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Función para verificar acceso de control (necesaria para validaciones)
CREATE OR REPLACE FUNCTION public.validate_control_access(
  p_ticket_id text,
  p_control_type_id uuid
)
RETURNS TABLE (
  can_access boolean,
  attendee_id uuid,
  category_id uuid,
  max_uses integer,
  current_uses bigint,
  error_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;