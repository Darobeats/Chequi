CREATE OR REPLACE FUNCTION public.profile_locked_fields(_user_id uuid)
RETURNS TABLE(email text, attendee_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT p.email, p.attendee_id FROM public.profiles p WHERE p.id = _user_id $$;
REVOKE EXECUTE ON FUNCTION public.profile_locked_fields(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_locked_fields(uuid) TO authenticated;
DROP POLICY IF EXISTS "Users can update own profile basic info" ON public.profiles;
CREATE POLICY "Users can update own profile basic info" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND NOT (email IS DISTINCT FROM (SELECT f.email FROM public.profile_locked_fields(auth.uid()) f))
  AND NOT (attendee_id IS DISTINCT FROM (SELECT f.attendee_id FROM public.profile_locked_fields(auth.uid()) f))
);