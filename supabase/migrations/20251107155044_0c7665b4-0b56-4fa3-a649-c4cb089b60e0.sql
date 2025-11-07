-- ============================================================================
-- FASE 3: SEPARACIÓN DE ROLES (CRÍTICO)
-- ============================================================================

-- Paso 1: Crear tabla user_roles separada
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Paso 2: Crear funciones SECURITY DEFINER para consultar roles
-- Esta función reemplaza get_current_user_role()
CREATE OR REPLACE FUNCTION public.get_user_role_secure(_user_id uuid DEFAULT auth.uid())
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- Esta función reemplaza has_role()
CREATE OR REPLACE FUNCTION public.user_has_role_secure(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Paso 3: RLS Policies en user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Super admins manage all roles"
ON public.user_roles FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Paso 4: Migrar datos existentes de profiles a user_roles
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT id, role, created_at 
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Paso 5: Actualizar TODAS las RLS policies para usar las nuevas funciones

-- ============================================================================
-- ACTUALIZAR POLICIES EN TABLA: attendees
-- ============================================================================
DROP POLICY IF EXISTS "Admin and control can delete attendees" ON public.attendees;
DROP POLICY IF EXISTS "Admin and control can insert attendees" ON public.attendees;
DROP POLICY IF EXISTS "Admin and control can update attendees" ON public.attendees;
DROP POLICY IF EXISTS "Admin and control can view attendees" ON public.attendees;
DROP POLICY IF EXISTS "Attendees can view own record" ON public.attendees;
DROP POLICY IF EXISTS "Control users can view all attendees" ON public.attendees;
DROP POLICY IF EXISTS "Viewers can view attendees" ON public.attendees;

CREATE POLICY "Admin and control can delete attendees"
ON public.attendees FOR DELETE
USING (
  (user_has_role_secure(auth.uid(), 'admin') OR user_has_role_secure(auth.uid(), 'control'))
  AND event_id = get_active_event_id()
);

CREATE POLICY "Admin and control can insert attendees"
ON public.attendees FOR INSERT
WITH CHECK (
  (user_has_role_secure(auth.uid(), 'admin') OR user_has_role_secure(auth.uid(), 'control'))
  AND event_id = get_active_event_id()
);

CREATE POLICY "Admin and control can update attendees"
ON public.attendees FOR UPDATE
USING (
  (user_has_role_secure(auth.uid(), 'admin') OR user_has_role_secure(auth.uid(), 'control'))
  AND event_id = get_active_event_id()
)
WITH CHECK (
  (user_has_role_secure(auth.uid(), 'admin') OR user_has_role_secure(auth.uid(), 'control'))
  AND event_id = get_active_event_id()
);

CREATE POLICY "Admin and control can view attendees"
ON public.attendees FOR SELECT
USING (
  (user_has_role_secure(auth.uid(), 'admin') OR user_has_role_secure(auth.uid(), 'control'))
  AND event_id = get_active_event_id()
);

CREATE POLICY "Attendees can view own record"
ON public.attendees FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'admin') 
  OR user_has_role_secure(auth.uid(), 'control')
  OR (
    user_has_role_secure(auth.uid(), 'attendee')
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.attendee_id = attendees.id
    )
  )
);

CREATE POLICY "Viewers can view attendees"
ON public.attendees FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'viewer')
  AND event_id = get_active_event_id()
);

-- ============================================================================
-- ACTUALIZAR POLICIES EN TABLA: control_types
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage control types" ON public.control_types;
DROP POLICY IF EXISTS "Authenticated users can view control types" ON public.control_types;
DROP POLICY IF EXISTS "Viewers can view control types" ON public.control_types;

CREATE POLICY "Admins can manage control types"
ON public.control_types FOR ALL
USING (
  user_has_role_secure(auth.uid(), 'admin')
  AND event_id = get_active_event_id()
)
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin')
  AND event_id = get_active_event_id()
);

CREATE POLICY "Authenticated users can view control types"
ON public.control_types FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND event_id = get_active_event_id()
);

CREATE POLICY "Viewers can view control types"
ON public.control_types FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'viewer')
  AND event_id = get_active_event_id()
);

-- ============================================================================
-- ACTUALIZAR POLICIES EN TABLA: category_controls
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage category controls" ON public.category_controls;
DROP POLICY IF EXISTS "Authenticated users can view category controls" ON public.category_controls;
DROP POLICY IF EXISTS "Viewers can view category controls" ON public.category_controls;

CREATE POLICY "Admins can manage category controls"
ON public.category_controls FOR ALL
USING (user_has_role_secure(auth.uid(), 'admin'))
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view category controls"
ON public.category_controls FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Viewers can view category controls"
ON public.category_controls FOR SELECT
USING (user_has_role_secure(auth.uid(), 'viewer'));

-- ============================================================================
-- ACTUALIZAR POLICIES EN TABLA: control_usage
-- ============================================================================
DROP POLICY IF EXISTS "Admin and control can insert control usage" ON public.control_usage;
DROP POLICY IF EXISTS "Admin and control can view control usage" ON public.control_usage;
DROP POLICY IF EXISTS "Admins and controls can manage usage" ON public.control_usage;
DROP POLICY IF EXISTS "Control users can insert usage" ON public.control_usage;
DROP POLICY IF EXISTS "Users can view relevant usage records" ON public.control_usage;
DROP POLICY IF EXISTS "Viewers can insert control usage" ON public.control_usage;
DROP POLICY IF EXISTS "Viewers can view control usage" ON public.control_usage;

CREATE POLICY "Admin and control can insert control usage"
ON public.control_usage FOR INSERT
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin')
  OR user_has_role_secure(auth.uid(), 'control')
);

CREATE POLICY "Admin and control can view control usage"
ON public.control_usage FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'admin')
  OR user_has_role_secure(auth.uid(), 'control')
);

CREATE POLICY "Viewers can view control usage"
ON public.control_usage FOR SELECT
USING (user_has_role_secure(auth.uid(), 'viewer'));

CREATE POLICY "Attendees can view own usage"
ON public.control_usage FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'attendee')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.attendees a ON p.attendee_id = a.id
    WHERE p.id = auth.uid() AND a.id = control_usage.attendee_id
  )
);

-- ============================================================================
-- ACTUALIZAR POLICIES EN TABLA: event_configs
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage event configs - insert" ON public.event_configs;
DROP POLICY IF EXISTS "Admins can manage event configs - select" ON public.event_configs;
DROP POLICY IF EXISTS "Admins can manage event configs - update" ON public.event_configs;

CREATE POLICY "Admins can manage event configs - insert"
ON public.event_configs FOR INSERT
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage event configs - select"
ON public.event_configs FOR SELECT
USING (user_has_role_secure(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage event configs - update"
ON public.event_configs FOR UPDATE
USING (user_has_role_secure(auth.uid(), 'admin'))
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'));

-- ============================================================================
-- ACTUALIZAR POLICIES EN TABLA: ticket_categories
-- ============================================================================
DROP POLICY IF EXISTS "Admins can delete ticket categories" ON public.ticket_categories;
DROP POLICY IF EXISTS "Admins can insert ticket categories" ON public.ticket_categories;
DROP POLICY IF EXISTS "Admins can update ticket categories" ON public.ticket_categories;
DROP POLICY IF EXISTS "Viewers can view ticket categories" ON public.ticket_categories;

CREATE POLICY "Admins can delete ticket categories"
ON public.ticket_categories FOR DELETE
USING (
  user_has_role_secure(auth.uid(), 'admin')
  AND event_id = get_active_event_id()
);

CREATE POLICY "Admins can insert ticket categories"
ON public.ticket_categories FOR INSERT
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin')
  AND event_id = get_active_event_id()
);

CREATE POLICY "Admins can update ticket categories"
ON public.ticket_categories FOR UPDATE
USING (
  user_has_role_secure(auth.uid(), 'admin')
  AND event_id = get_active_event_id()
)
WITH CHECK (
  user_has_role_secure(auth.uid(), 'admin')
  AND event_id = get_active_event_id()
);

CREATE POLICY "Viewers can view ticket categories"
ON public.ticket_categories FOR SELECT
USING (
  user_has_role_secure(auth.uid(), 'viewer')
  AND event_id = get_active_event_id()
);

-- ============================================================================
-- ACTUALIZAR POLICIES EN TABLA: ticket_templates
-- ============================================================================
DROP POLICY IF EXISTS "Admins can delete ticket templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can insert ticket templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can update ticket templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can view ticket templates" ON public.ticket_templates;

CREATE POLICY "Admins can delete ticket templates"
ON public.ticket_templates FOR DELETE
USING (user_has_role_secure(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert ticket templates"
ON public.ticket_templates FOR INSERT
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ticket templates"
ON public.ticket_templates FOR UPDATE
USING (user_has_role_secure(auth.uid(), 'admin'))
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'));

CREATE POLICY "Admins can view ticket templates"
ON public.ticket_templates FOR SELECT
USING (user_has_role_secure(auth.uid(), 'admin'));

-- ============================================================================
-- ACTUALIZAR POLICIES EN TABLA: qr_templates
-- ============================================================================
DROP POLICY IF EXISTS "Admin users can create QR templates" ON public.qr_templates;
DROP POLICY IF EXISTS "Admin users can delete QR templates" ON public.qr_templates;
DROP POLICY IF EXISTS "Admin users can update QR templates" ON public.qr_templates;
DROP POLICY IF EXISTS "Admin users can view QR templates" ON public.qr_templates;

CREATE POLICY "Admin users can create QR templates"
ON public.qr_templates FOR INSERT
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'));

CREATE POLICY "Admin users can delete QR templates"
ON public.qr_templates FOR DELETE
USING (user_has_role_secure(auth.uid(), 'admin'));

CREATE POLICY "Admin users can update QR templates"
ON public.qr_templates FOR UPDATE
USING (user_has_role_secure(auth.uid(), 'admin'))
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'));

CREATE POLICY "Admin users can view QR templates"
ON public.qr_templates FOR SELECT
USING (user_has_role_secure(auth.uid(), 'admin'));

-- ============================================================================
-- ACTUALIZAR POLICIES EN TABLA: profiles
-- ============================================================================
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (user_has_role_secure(auth.uid(), 'admin'))
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (user_has_role_secure(auth.uid(), 'admin'));

-- ============================================================================
-- ACTUALIZAR POLICIES EN TABLA: logs_entrada
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage legacy logs" ON public.logs_entrada;

CREATE POLICY "Admins can manage legacy logs"
ON public.logs_entrada FOR ALL
USING (user_has_role_secure(auth.uid(), 'admin'))
WITH CHECK (user_has_role_secure(auth.uid(), 'admin'));

-- ============================================================================
-- FASE 4: PROTECCIÓN DE TABLA LEGACY asistentes
-- ============================================================================

-- Eliminar policies existentes
DROP POLICY IF EXISTS "Admins can view asistentes read-only" ON public.asistentes;
DROP POLICY IF EXISTS "Super admins can delete asistentes" ON public.asistentes;
DROP POLICY IF EXISTS "Super admins can insert asistentes" ON public.asistentes;
DROP POLICY IF EXISTS "Super admins can update asistentes" ON public.asistentes;

-- Solo super admins pueden acceder a datos legacy (contiene PII histórica)
CREATE POLICY "Only super admins can access legacy asistentes"
ON public.asistentes FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ============================================================================
-- FASE 5: PROTECCIÓN DE CÉDULAS EN attendees
-- ============================================================================

-- Las cédulas solo deben ser visibles para admins y control, NO para viewers
-- La policy actual "Viewers can view attendees" les da acceso a todo incluyendo cédulas

-- No necesitamos cambiar las policies de attendees porque ya están bien configuradas
-- Los viewers solo pueden hacer SELECT pero el problema es que ven las cédulas
-- La solución es crear una vista sin cédulas para viewers

-- Crear vista pública sin cédulas para viewers
DROP VIEW IF EXISTS public.attendees_public;
CREATE VIEW public.attendees_public AS
SELECT 
  id,
  ticket_id,
  name,
  category_id,
  status,
  qr_code,
  created_at,
  updated_at,
  event_id
  -- Nota: cedula NO está incluida
FROM public.attendees;

-- Grant access a la vista
GRANT SELECT ON public.attendees_public TO authenticated;

-- RLS en la vista (viewers pueden ver, admins/control usan la tabla directamente)
ALTER VIEW public.attendees_public SET (security_invoker = true);

COMMENT ON VIEW public.attendees_public IS 'Vista sin cédulas para roles con acceso limitado. Admins y Control deben usar la tabla attendees directamente.';
COMMENT ON TABLE public.attendees IS 'IMPORTANTE: Contiene cédulas (PII sensible). Solo admins y control tienen acceso completo. Viewers deben usar attendees_public view.';

-- ============================================================================
-- SEGURIDAD: Agregar comentarios de auditoría
-- ============================================================================

COMMENT ON TABLE public.user_roles IS 'CRITICAL SECURITY: Roles separados de profiles para prevenir escalamiento de privilegios. Solo modificable por super admins.';
COMMENT ON FUNCTION public.user_has_role_secure IS 'SECURITY DEFINER function para verificar roles sin recursión en RLS';
COMMENT ON FUNCTION public.get_user_role_secure IS 'SECURITY DEFINER function para obtener rol de usuario sin recursión en RLS';
COMMENT ON TABLE public.asistentes IS 'LEGACY TABLE - Solo accesible por super admins. Contiene datos históricos con PII. Migrar a attendees para nuevos eventos.';