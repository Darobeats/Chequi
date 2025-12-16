-- ====================================
-- Sistema Multi-Evento: Asignación Usuario-Evento
-- ====================================

-- 1. Crear tabla de asignaciones de usuarios a eventos
CREATE TABLE IF NOT EXISTS public.user_event_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.event_configs(id) ON DELETE CASCADE,
  role_in_event TEXT NOT NULL DEFAULT 'scanner' CHECK (role_in_event IN ('admin', 'control', 'scanner')),
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID,
  
  UNIQUE(user_id, event_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_event_assignments_user ON public.user_event_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_assignments_event ON public.user_event_assignments(event_id);

-- 2. Habilitar RLS en user_event_assignments
ALTER TABLE public.user_event_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para user_event_assignments
-- Super admins pueden gestionar todas las asignaciones
CREATE POLICY "Super admins manage all event assignments" ON public.user_event_assignments
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Admins de evento pueden ver asignaciones de sus eventos
CREATE POLICY "Event admins can view their event assignments" ON public.user_event_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_event_assignments uea
      WHERE uea.user_id = auth.uid() 
      AND uea.event_id = user_event_assignments.event_id
      AND uea.role_in_event = 'admin'
    )
  );

-- Admins de evento pueden gestionar asignaciones de sus eventos
CREATE POLICY "Event admins can manage their event assignments" ON public.user_event_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_event_assignments uea
      WHERE uea.user_id = auth.uid() 
      AND uea.event_id = user_event_assignments.event_id
      AND uea.role_in_event = 'admin'
    )
  );

CREATE POLICY "Event admins can update their event assignments" ON public.user_event_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_event_assignments uea
      WHERE uea.user_id = auth.uid() 
      AND uea.event_id = user_event_assignments.event_id
      AND uea.role_in_event = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_event_assignments uea
      WHERE uea.user_id = auth.uid() 
      AND uea.event_id = user_event_assignments.event_id
      AND uea.role_in_event = 'admin'
    )
  );

CREATE POLICY "Event admins can delete their event assignments" ON public.user_event_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_event_assignments uea
      WHERE uea.user_id = auth.uid() 
      AND uea.event_id = user_event_assignments.event_id
      AND uea.role_in_event = 'admin'
    )
  );

-- Usuarios pueden ver sus propias asignaciones
CREATE POLICY "Users can view own event assignments" ON public.user_event_assignments
  FOR SELECT USING (user_id = auth.uid());

-- 4. Función para obtener eventos del usuario
CREATE OR REPLACE FUNCTION public.get_user_events(check_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  event_id UUID,
  event_name TEXT,
  role_in_event TEXT,
  is_primary BOOLEAN,
  event_status TEXT,
  event_date DATE,
  is_active BOOLEAN
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ec.id as event_id,
    ec.event_name,
    uea.role_in_event,
    uea.is_primary,
    ec.event_status,
    ec.event_date,
    ec.is_active
  FROM user_event_assignments uea
  JOIN event_configs ec ON ec.id = uea.event_id
  WHERE uea.user_id = check_user_id
  AND ec.event_status IN ('active', 'draft')
  ORDER BY uea.is_primary DESC, ec.event_date DESC NULLS LAST;
$$;

-- 5. Función para verificar acceso a evento específico
CREATE OR REPLACE FUNCTION public.user_can_access_event(check_event_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_event_assignments
    WHERE user_id = check_user_id AND event_id = check_event_id
  ) OR is_super_admin(check_user_id);
$$;

-- 6. Función para obtener el rol del usuario en un evento específico
CREATE OR REPLACE FUNCTION public.get_user_role_in_event(check_event_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role_in_event FROM public.user_event_assignments
     WHERE user_id = check_user_id AND event_id = check_event_id),
    CASE WHEN is_super_admin(check_user_id) THEN 'admin' ELSE NULL END
  );
$$;