-- =====================================================
-- PASO 2: Crear funciones de verificación de roles
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_access_scanner(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = check_user_id 
    AND role IN ('admin', 'control', 'scanner')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_dashboard(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = check_user_id 
    AND role IN ('admin', 'control')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_modify_data(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = check_user_id 
    AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.can_access_scanner IS 'Roles: admin, control, scanner pueden acceder al módulo scanner';
COMMENT ON FUNCTION public.can_access_dashboard IS 'Roles: admin y control pueden acceder al dashboard (solo admin puede modificar)';
COMMENT ON FUNCTION public.can_modify_data IS 'Solo admin puede crear/modificar/eliminar datos';