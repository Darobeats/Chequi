ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS email text;

CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.event_configs(id) ON DELETE CASCADE,
  subject text NOT NULL,
  greeting text,
  body text,
  status text NOT NULL DEFAULT 'draft',
  total integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_select" ON public.email_campaigns FOR SELECT TO authenticated
  USING (public.user_can_access_event(event_id, auth.uid()));
CREATE POLICY "campaigns_insert" ON public.email_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_event_team(event_id, auth.uid()) OR (public.can_modify_data(auth.uid()) AND public.user_can_access_event(event_id, auth.uid())));
CREATE POLICY "campaigns_update" ON public.email_campaigns FOR UPDATE TO authenticated
  USING (public.can_manage_event_team(event_id, auth.uid()) OR (public.can_modify_data(auth.uid()) AND public.user_can_access_event(event_id, auth.uid())));
CREATE POLICY "campaigns_delete" ON public.email_campaigns FOR DELETE TO authenticated
  USING (public.can_manage_event_team(event_id, auth.uid()) OR (public.can_modify_data(auth.uid()) AND public.user_can_access_event(event_id, auth.uid())));
CREATE TRIGGER email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.event_configs(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message_id text,
  error text,
  ticket_url text,
  view_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, attendee_id),
  UNIQUE (view_token)
);
CREATE INDEX ecr_campaign_status_idx ON public.email_campaign_recipients(campaign_id, status);
CREATE INDEX ecr_event_attendee_idx ON public.email_campaign_recipients(event_id, attendee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaign_recipients TO authenticated;
GRANT ALL ON public.email_campaign_recipients TO service_role;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecr_select" ON public.email_campaign_recipients FOR SELECT TO authenticated
  USING (public.user_can_access_event(event_id, auth.uid()));
CREATE POLICY "ecr_insert" ON public.email_campaign_recipients FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_event_team(event_id, auth.uid()) OR (public.can_modify_data(auth.uid()) AND public.user_can_access_event(event_id, auth.uid())));
CREATE POLICY "ecr_update" ON public.email_campaign_recipients FOR UPDATE TO authenticated
  USING (public.can_manage_event_team(event_id, auth.uid()) OR (public.can_modify_data(auth.uid()) AND public.user_can_access_event(event_id, auth.uid())));
CREATE POLICY "ecr_delete" ON public.email_campaign_recipients FOR DELETE TO authenticated
  USING (public.can_manage_event_team(event_id, auth.uid()) OR (public.can_modify_data(auth.uid()) AND public.user_can_access_event(event_id, auth.uid())));