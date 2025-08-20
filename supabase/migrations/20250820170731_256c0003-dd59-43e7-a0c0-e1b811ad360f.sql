-- Fix critical security vulnerability: Prevent unauthorized user account creation
-- Issue: Current policy allows anyone to create profiles with any role including admin/control

-- Drop the overly permissive profile creation policy
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

-- Create secure profile creation policy that:
-- 1. Only allows authenticated users to create profiles
-- 2. Only allows users to create profiles for themselves (auth.uid())
-- 3. Only allows default 'attendee' role (prevents privilege escalation)
-- 4. Prevents setting arbitrary user_ids or elevated roles
CREATE POLICY "Authenticated users can create own profile with attendee role only" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User can only create profile for themselves
  auth.uid() = id 
  AND 
  -- Can only set role to attendee (default role)
  role = 'attendee'::user_role
  AND
  -- Email must match authenticated user's email
  email = auth.email()
);