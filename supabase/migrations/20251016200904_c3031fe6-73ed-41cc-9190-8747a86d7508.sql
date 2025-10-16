-- Create ticket_templates table for customizable ticket printing
CREATE TABLE IF NOT EXISTS public.ticket_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_config_id uuid REFERENCES public.event_configs(id) ON DELETE CASCADE,
  name text NOT NULL,
  tickets_per_page integer NOT NULL DEFAULT 4,
  layout text NOT NULL DEFAULT '2x2',
  show_qr boolean NOT NULL DEFAULT true,
  show_name boolean NOT NULL DEFAULT true,
  show_email boolean NOT NULL DEFAULT true,
  show_category boolean NOT NULL DEFAULT false,
  show_ticket_id boolean NOT NULL DEFAULT false,
  custom_fields jsonb DEFAULT '[]'::jsonb,
  qr_size integer NOT NULL DEFAULT 200,
  font_size_name integer NOT NULL DEFAULT 14,
  font_size_info integer NOT NULL DEFAULT 10,
  margin_top integer NOT NULL DEFAULT 20,
  margin_bottom integer NOT NULL DEFAULT 20,
  margin_left integer NOT NULL DEFAULT 20,
  margin_right integer NOT NULL DEFAULT 20,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can manage ticket templates
CREATE POLICY "Admins can view ticket templates"
  ON public.ticket_templates
  FOR SELECT
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert ticket templates"
  ON public.ticket_templates
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update ticket templates"
  ON public.ticket_templates
  FOR UPDATE
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete ticket templates"
  ON public.ticket_templates
  FOR DELETE
  USING (get_current_user_role() = 'admin');

-- Trigger for updated_at
CREATE TRIGGER update_ticket_templates_updated_at
  BEFORE UPDATE ON public.ticket_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();