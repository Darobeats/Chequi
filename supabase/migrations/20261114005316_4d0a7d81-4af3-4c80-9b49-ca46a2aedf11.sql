DROP POLICY IF EXISTS "Users can update own profile basic info" ON public.profiles;
DROP FUNCTION IF EXISTS public.profile_locked_fields(uuid);
CREATE OR REPLACE FUNCTION public.my_profile_locked_fields()
RETURNS TABLE(email text, attendee_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT p.email, p.attendee_id FROM public.profiles p WHERE p.id = auth.uid() $$;
REVOKE EXECUTE ON FUNCTION public.my_profile_locked_fields() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_profile_locked_fields() TO authenticated;
CREATE POLICY "Users can update own profile basic info" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND NOT (email IS DISTINCT FROM (SELECT f.email FROM public.my_profile_locked_fields() f))
  AND NOT (attendee_id IS DISTINCT FROM (SELECT f.attendee_id FROM public.my_profile_locked_fields() f))
);