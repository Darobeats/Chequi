-- The login_partner_logos table was created without table-level grants, so PostgREST
-- returns 401 for every read even though RLS allows viewing visible logos.
GRANT SELECT ON public.login_partner_logos TO anon;
GRANT SELECT ON public.login_partner_logos TO authenticated;
GRANT ALL ON public.login_partner_logos TO service_role;