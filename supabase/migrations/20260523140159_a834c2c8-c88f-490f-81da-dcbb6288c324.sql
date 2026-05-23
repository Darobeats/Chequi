
-- 1. Fix get_current_user_role to read from user_roles (profiles has no role column)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$function$;

-- 2. Defense in depth: explicit restrictive policies preventing privilege escalation on user_roles
CREATE POLICY "Block non-super-admin role inserts"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Block non-super-admin role updates"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Block non-super-admin role deletes"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 3. Prevent enumeration of public buckets (files still accessible via direct public URL)
DROP POLICY IF EXISTS "Anyone can view event assets" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view ticket backgrounds" ON storage.objects;
