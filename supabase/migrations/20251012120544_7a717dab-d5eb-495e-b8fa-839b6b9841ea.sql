-- Remove public access to control_types table
-- This prevents unauthorized users from seeing the event's security infrastructure
DROP POLICY IF EXISTS "Public can view control types" ON public.control_types;

-- The table already has a policy for authenticated users:
-- "Authenticated users can view control types" which is sufficient
-- This ensures only logged-in users can view control types