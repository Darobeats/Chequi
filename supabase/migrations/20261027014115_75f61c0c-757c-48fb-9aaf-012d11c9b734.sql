DROP POLICY "Anyone sees visible login logos" ON public.login_partner_logos;

CREATE POLICY "Anyone sees visible login logos"
  ON public.login_partner_logos
  FOR SELECT
  TO anon
  USING (is_visible);

CREATE POLICY "Authenticated sees visible or super admin logos"
  ON public.login_partner_logos
  FOR SELECT
  TO authenticated
  USING (is_visible OR is_super_admin(auth.uid()));

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;