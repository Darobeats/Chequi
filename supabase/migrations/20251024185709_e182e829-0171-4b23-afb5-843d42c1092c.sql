-- FASE 1: Estructura Multi-Evento

-- 1.1 Agregar event_id a tablas principales
ALTER TABLE public.attendees 
ADD COLUMN event_id UUID REFERENCES public.event_configs(id) ON DELETE CASCADE;

ALTER TABLE public.control_types 
ADD COLUMN event_id UUID REFERENCES public.event_configs(id) ON DELETE CASCADE;

ALTER TABLE public.ticket_categories 
ADD COLUMN event_id UUID REFERENCES public.event_configs(id) ON DELETE CASCADE;

ALTER TABLE public.qr_templates 
ADD COLUMN event_id UUID REFERENCES public.event_configs(id) ON DELETE CASCADE;

-- Agregar campos adicionales a event_configs para mejor gestión
ALTER TABLE public.event_configs
ADD COLUMN event_date DATE,
ADD COLUMN event_status TEXT DEFAULT 'active' CHECK (event_status IN ('draft', 'active', 'finished'));

-- 1.2 Función de evento activo
CREATE OR REPLACE FUNCTION public.get_active_event_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.event_configs WHERE is_active = true LIMIT 1;
$$;

-- 1.3 Migrar datos existentes al evento activo actual
DO $$
DECLARE
  active_event_id UUID;
BEGIN
  -- Obtener el evento activo
  SELECT id INTO active_event_id FROM public.event_configs WHERE is_active = true LIMIT 1;
  
  -- Si no hay evento activo, crear uno
  IF active_event_id IS NULL THEN
    INSERT INTO public.event_configs (event_name, primary_color, secondary_color, accent_color, font_family, is_active, event_status)
    VALUES ('Evento Principal', '#D4AF37', '#0A0A0A', '#F8F9FA', 'Inter', true, 'active')
    RETURNING id INTO active_event_id;
  END IF;
  
  -- Asignar todos los registros existentes al evento activo
  UPDATE public.attendees SET event_id = active_event_id WHERE event_id IS NULL;
  UPDATE public.control_types SET event_id = active_event_id WHERE event_id IS NULL;
  UPDATE public.ticket_categories SET event_id = active_event_id WHERE event_id IS NULL;
  UPDATE public.qr_templates SET event_id = active_event_id WHERE event_id IS NULL;
END $$;

-- 1.4 Marcar event_id como NOT NULL después de migración
ALTER TABLE public.attendees ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.control_types ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.ticket_categories ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.qr_templates ALTER COLUMN event_id SET NOT NULL;

-- 1.5 Actualizar RLS Policies para filtrar por evento activo

-- Políticas para attendees
DROP POLICY IF EXISTS "Admin and control can view attendees" ON public.attendees;
CREATE POLICY "Admin and control can view attendees" 
ON public.attendees FOR SELECT 
USING (
  (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'control'::user_role]))
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Admin and control can insert attendees" ON public.attendees;
CREATE POLICY "Admin and control can insert attendees" 
ON public.attendees FOR INSERT 
WITH CHECK (
  (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'control'::user_role]))
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Admin and control can update attendees" ON public.attendees;
CREATE POLICY "Admin and control can update attendees" 
ON public.attendees FOR UPDATE 
USING (
  (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'control'::user_role]))
  AND event_id = get_active_event_id()
)
WITH CHECK (
  (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'control'::user_role]))
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Admin and control can delete attendees" ON public.attendees;
CREATE POLICY "Admin and control can delete attendees" 
ON public.attendees FOR DELETE 
USING (
  (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'control'::user_role]))
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Viewers can view attendees" ON public.attendees;
CREATE POLICY "Viewers can view attendees" 
ON public.attendees FOR SELECT 
USING (
  (get_current_user_role() = 'viewer'::user_role)
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Control users can view all attendees" ON public.attendees;
CREATE POLICY "Control users can view all attendees" 
ON public.attendees FOR SELECT 
USING (
  (get_current_user_role() = 'control'::user_role)
  AND event_id = get_active_event_id()
);

-- Políticas para control_types
DROP POLICY IF EXISTS "Authenticated users can view control types" ON public.control_types;
CREATE POLICY "Authenticated users can view control types" 
ON public.control_types FOR SELECT 
USING (
  (auth.uid() IS NOT NULL)
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Admins can manage control types" ON public.control_types;
CREATE POLICY "Admins can manage control types" 
ON public.control_types FOR ALL 
USING (
  (get_current_user_role() = 'admin'::user_role)
  AND event_id = get_active_event_id()
)
WITH CHECK (
  (get_current_user_role() = 'admin'::user_role)
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Viewers can view control types" ON public.control_types;
CREATE POLICY "Viewers can view control types" 
ON public.control_types FOR SELECT 
USING (
  (get_current_user_role() = 'viewer'::user_role)
  AND event_id = get_active_event_id()
);

-- Políticas para ticket_categories
DROP POLICY IF EXISTS "Authenticated users can view ticket categories" ON public.ticket_categories;
CREATE POLICY "Authenticated users can view ticket categories" 
ON public.ticket_categories FOR SELECT 
USING (
  (auth.uid() IS NOT NULL)
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Admins can insert ticket categories" ON public.ticket_categories;
CREATE POLICY "Admins can insert ticket categories" 
ON public.ticket_categories FOR INSERT 
WITH CHECK (
  (get_current_user_role() = 'admin'::user_role)
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Admins can update ticket categories" ON public.ticket_categories;
CREATE POLICY "Admins can update ticket categories" 
ON public.ticket_categories FOR UPDATE 
USING (
  (get_current_user_role() = 'admin'::user_role)
  AND event_id = get_active_event_id()
)
WITH CHECK (
  (get_current_user_role() = 'admin'::user_role)
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Admins can delete ticket categories" ON public.ticket_categories;
CREATE POLICY "Admins can delete ticket categories" 
ON public.ticket_categories FOR DELETE 
USING (
  (get_current_user_role() = 'admin'::user_role)
  AND event_id = get_active_event_id()
);

DROP POLICY IF EXISTS "Viewers can view ticket categories" ON public.ticket_categories;
CREATE POLICY "Viewers can view ticket categories" 
ON public.ticket_categories FOR SELECT 
USING (
  (get_current_user_role() = 'viewer'::user_role)
  AND event_id = get_active_event_id()
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON public.attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_control_types_event_id ON public.control_types(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_categories_event_id ON public.ticket_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_qr_templates_event_id ON public.qr_templates(event_id);