
-- Add new branding fields to event_configs
ALTER TABLE public.event_configs
  ADD COLUMN IF NOT EXISTS background_url text,
  ADD COLUMN IF NOT EXISTS sponsor_logos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS welcome_message text,
  ADD COLUMN IF NOT EXISTS background_opacity numeric DEFAULT 0.15;

-- Create storage bucket for event assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can view event assets (public bucket)
CREATE POLICY "Anyone can view event assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-assets');

-- RLS: Authenticated admins can upload event assets
CREATE POLICY "Admins can upload event assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-assets'
  AND user_has_role_secure(auth.uid(), 'admin'::user_role)
);

-- RLS: Authenticated admins can update event assets
CREATE POLICY "Admins can update event assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-assets'
  AND user_has_role_secure(auth.uid(), 'admin'::user_role)
);

-- RLS: Authenticated admins can delete event assets
CREATE POLICY "Admins can delete event assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-assets'
  AND user_has_role_secure(auth.uid(), 'admin'::user_role)
);
