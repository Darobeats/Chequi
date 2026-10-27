-- 1. Storage policies for event-assets
DROP POLICY IF EXISTS "Admins can upload event assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update event assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete event assets" ON storage.objects;

CREATE OR REPLACE FUNCTION public.can_manage_event_asset(object_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_folder text; v_event uuid;
BEGIN
  IF public.is_super_admin(auth.uid()) THEN RETURN true; END IF;
  IF NOT public.user_has_role_secure(auth.uid(), 'admin') THEN RETURN false; END IF;
  v_folder := split_part(object_name, '/', 1);
  BEGIN v_event := v_folder::uuid; EXCEPTION WHEN others THEN RETURN false; END;
  RETURN public.user_can_access_event(v_event, auth.uid());
END; $$;
REVOKE EXECUTE ON FUNCTION public.can_manage_event_asset(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_manage_event_asset(text) TO authenticated;

CREATE POLICY "Event assets select for managers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-assets' AND public.can_manage_event_asset(name));
CREATE POLICY "Event assets insert for managers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-assets' AND public.can_manage_event_asset(name));
CREATE POLICY "Event assets update for managers" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-assets' AND public.can_manage_event_asset(name))
  WITH CHECK (bucket_id = 'event-assets' AND public.can_manage_event_asset(name));
CREATE POLICY "Event assets delete for managers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-assets' AND public.can_manage_event_asset(name));

-- 2. Delete event cascade
CREATE OR REPLACE FUNCTION public.delete_event_cascade(p_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo el super admin puede eliminar eventos' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.event_configs WHERE id = p_event_id AND is_active = true) THEN
    RAISE EXCEPTION 'Desactiva el evento antes de eliminarlo';
  END IF;
  DELETE FROM public.control_usage WHERE attendee_id IN (SELECT id FROM public.attendees WHERE event_id = p_event_id);
  UPDATE public.profiles SET attendee_id = NULL WHERE attendee_id IN (SELECT id FROM public.attendees WHERE event_id = p_event_id);
  DELETE FROM public.attendees WHERE event_id = p_event_id;
  DELETE FROM public.qr_templates WHERE event_id = p_event_id;
  UPDATE public.kiosk_profiles SET default_control_type_id = NULL WHERE event_id = p_event_id;
  DELETE FROM public.event_configs WHERE id = p_event_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.delete_event_cascade(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_event_cascade(uuid) TO authenticated;

-- 3. Login partner logos
CREATE TABLE public.login_partner_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  link_url text,
  kind text NOT NULL DEFAULT 'sponsor',
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.login_partner_logos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_partner_logos TO authenticated;
GRANT ALL ON public.login_partner_logos TO service_role;
ALTER TABLE public.login_partner_logos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone sees visible login logos" ON public.login_partner_logos FOR SELECT USING (is_visible OR public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin manages login logos" ON public.login_partner_logos FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER login_partner_logos_updated_at BEFORE UPDATE ON public.login_partner_logos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Super admin manages login logo files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'event-assets' AND split_part(name,'/',1) = 'login-partners' AND public.is_super_admin(auth.uid()))
  WITH CHECK (bucket_id = 'event-assets' AND split_part(name,'/',1) = 'login-partners' AND public.is_super_admin(auth.uid()));

-- 4. AI credit ledger
CREATE TABLE public.ai_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL DEFAULT 'usage',
  credits numeric NOT NULL,
  input_tokens integer,
  output_tokens integer,
  event_id uuid,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_credit_ledger TO authenticated;
GRANT ALL ON public.ai_credit_ledger TO service_role;
ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin reads credit ledger" ON public.ai_credit_ledger FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin records topups" ON public.ai_credit_ledger FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) AND entry_type IN ('topup','set_balance','exhausted'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_credit_ledger;

CREATE OR REPLACE FUNCTION public.get_ai_credit_balance()
RETURNS TABLE(balance numeric, last_set_at timestamptz, exhausted boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_base numeric := 0; v_at timestamptz := 'epoch';
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  SELECT credits, created_at INTO v_base, v_at FROM public.ai_credit_ledger WHERE entry_type='set_balance' ORDER BY created_at DESC LIMIT 1;
  v_base := COALESCE(v_base,0); v_at := COALESCE(v_at,'epoch');
  RETURN QUERY SELECT
    v_base + COALESCE((SELECT sum(credits) FROM public.ai_credit_ledger WHERE created_at > v_at AND entry_type='topup'),0)
           - COALESCE((SELECT sum(credits) FROM public.ai_credit_ledger WHERE created_at > v_at AND entry_type='usage'),0),
    CASE WHEN v_at='epoch' THEN NULL ELSE v_at END,
    EXISTS (SELECT 1 FROM public.ai_credit_ledger e WHERE e.entry_type='exhausted' AND e.created_at > v_at
            AND NOT EXISTS (SELECT 1 FROM public.ai_credit_ledger t WHERE t.entry_type='topup' AND t.created_at > e.created_at));
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_ai_credit_balance() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_ai_credit_balance() TO authenticated;