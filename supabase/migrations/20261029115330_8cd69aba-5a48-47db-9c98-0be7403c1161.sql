CREATE TABLE public.event_registration_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.event_configs(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT 'Registro',
  welcome_message text,
  success_message text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  dedupe_keys text[] NOT NULL DEFAULT ARRAY['cedula']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registration_forms TO authenticated;
GRANT ALL ON public.event_registration_forms TO service_role;
ALTER TABLE public.event_registration_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event members read forms" ON public.event_registration_forms FOR SELECT TO authenticated USING (public.user_can_access_event(event_id, auth.uid()));
CREATE POLICY "Super admin insert forms" ON public.event_registration_forms FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin update forms" ON public.event_registration_forms FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin delete forms" ON public.event_registration_forms FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE TRIGGER event_registration_forms_updated_at BEFORE UPDATE ON public.event_registration_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.event_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_configs(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_value text,
  consent_version text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX event_form_submissions_dedupe ON public.event_form_submissions(event_id, dedupe_value) WHERE dedupe_value IS NOT NULL;
CREATE INDEX event_form_submissions_event ON public.event_form_submissions(event_id, created_at DESC);
CREATE INDEX event_form_submissions_ip ON public.event_form_submissions(ip_hash, created_at DESC);
GRANT SELECT, DELETE ON public.event_form_submissions TO authenticated;
GRANT ALL ON public.event_form_submissions TO service_role;
ALTER TABLE public.event_form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event dashboard users read submissions" ON public.event_form_submissions FOR SELECT TO authenticated USING (public.user_can_access_event(event_id, auth.uid()) AND public.can_access_dashboard(auth.uid()));
CREATE POLICY "Event admins delete submissions" ON public.event_form_submissions FOR DELETE TO authenticated USING (public.can_manage_event_team(event_id, auth.uid()));