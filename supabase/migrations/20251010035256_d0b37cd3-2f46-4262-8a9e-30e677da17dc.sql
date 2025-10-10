-- Allow public read access to control_types for scanner functionality
-- This is necessary because the scanner should work without authentication

DROP POLICY IF EXISTS "Public can view control types" ON public.control_types;

CREATE POLICY "Public can view control types"
ON public.control_types
FOR SELECT
TO public
USING (true);

-- Add comment explaining why this table is publicly readable
COMMENT ON TABLE public.control_types IS 'Control types are publicly readable to support unauthenticated scanner functionality. Only admins can modify this data.';