
-- 1. KIOSK PROFILES
CREATE TABLE public.kiosk_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_configs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  control_type_ids uuid[] NOT NULL DEFAULT '{}',
  default_control_type_id uuid REFERENCES public.control_types(id) ON DELETE SET NULL,
  auto_select_mode text NOT NULL DEFAULT 'fixed' CHECK (auto_select_mode IN ('fixed','time_based','sequential')),
  time_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  allow_operator_override boolean NOT NULL DEFAULT true,
  lock_ui boolean NOT NULL DEFAULT false,
  auto_resume_ms integer NOT NULL DEFAULT 1500,
  require_pin text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiosk_profiles TO authenticated;
GRANT ALL ON public.kiosk_profiles TO service_role;

ALTER TABLE public.kiosk_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event team can view kiosk profiles"
  ON public.kiosk_profiles FOR SELECT TO authenticated
  USING (public.user_can_access_event(event_id, auth.uid()));

CREATE POLICY "Event admins can insert kiosk profiles"
  ON public.kiosk_profiles FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_event_team(event_id, auth.uid()));

CREATE POLICY "Event admins can update kiosk profiles"
  ON public.kiosk_profiles FOR UPDATE TO authenticated
  USING (public.can_manage_event_team(event_id, auth.uid()))
  WITH CHECK (public.can_manage_event_team(event_id, auth.uid()));

CREATE POLICY "Event admins can delete kiosk profiles"
  ON public.kiosk_profiles FOR DELETE TO authenticated
  USING (public.can_manage_event_team(event_id, auth.uid()));

CREATE TRIGGER kiosk_profiles_updated_at
  BEFORE UPDATE ON public.kiosk_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX kiosk_profiles_event_id_idx ON public.kiosk_profiles(event_id);

-- 2. TICKET TEMPLATE CATEGORY BINDINGS
CREATE TABLE public.ticket_template_category_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.ticket_templates(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.ticket_categories(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, category_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_template_category_bindings TO authenticated;
GRANT ALL ON public.ticket_template_category_bindings TO service_role;

ALTER TABLE public.ticket_template_category_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event team can view template bindings"
  ON public.ticket_template_category_bindings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ticket_categories tc
      WHERE tc.id = category_id
        AND public.user_can_access_event(tc.event_id, auth.uid())
    )
  );

CREATE POLICY "Event admins can manage template bindings"
  ON public.ticket_template_category_bindings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ticket_categories tc
      WHERE tc.id = category_id
        AND public.can_manage_event_team(tc.event_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ticket_categories tc
      WHERE tc.id = category_id
        AND public.can_manage_event_team(tc.event_id, auth.uid())
    )
  );

CREATE INDEX ttcb_template_id_idx ON public.ticket_template_category_bindings(template_id);
CREATE INDEX ttcb_category_id_idx ON public.ticket_template_category_bindings(category_id);

-- 3. TICKET TEMPLATES: background transform
ALTER TABLE public.ticket_templates
  ADD COLUMN IF NOT EXISTS background_transform jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4. RPC: attendee counts (avoid downloading 8-10k rows just for KPIs)
CREATE OR REPLACE FUNCTION public.get_event_attendee_counts(p_event_id uuid)
RETURNS TABLE(total_attendees bigint, attendees_with_usage bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.user_can_access_event(p_event_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied for event %', p_event_id USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*)::bigint FROM public.attendees WHERE event_id = p_event_id),
    (SELECT count(DISTINCT cu.attendee_id)::bigint
       FROM public.control_usage cu
       JOIN public.attendees a ON a.id = cu.attendee_id
       WHERE a.event_id = p_event_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_event_attendee_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_attendee_counts(uuid) TO authenticated;
