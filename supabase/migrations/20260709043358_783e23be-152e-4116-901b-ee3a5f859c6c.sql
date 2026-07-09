
CREATE TABLE public.ticket_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.ticket_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  label TEXT,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, version_number)
);

CREATE INDEX idx_ttv_template ON public.ticket_template_versions(template_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_template_versions TO authenticated;
GRANT ALL ON public.ticket_template_versions TO service_role;

ALTER TABLE public.ticket_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view template versions"
  ON public.ticket_template_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage template versions"
  ON public.ticket_template_versions FOR ALL
  TO authenticated
  USING (public.can_modify_data(auth.uid()))
  WITH CHECK (public.can_modify_data(auth.uid()));

-- Auto-assign next version_number per template
CREATE OR REPLACE FUNCTION public.set_ticket_template_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.version_number IS NULL THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
      INTO NEW.version_number
      FROM public.ticket_template_versions
      WHERE template_id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_ttv_version
  BEFORE INSERT ON public.ticket_template_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_template_version_number();
