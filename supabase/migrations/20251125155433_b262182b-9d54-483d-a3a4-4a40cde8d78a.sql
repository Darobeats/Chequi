-- Clean up duplicate user roles (keep the most recent role per user)
-- Step 1: Delete duplicate roles, keeping only the most recent one
DELETE FROM public.user_roles
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id 
             ORDER BY granted_at DESC NULLS LAST, created_at DESC NULLS LAST
           ) as rn
    FROM public.user_roles
  ) ranked
  WHERE rn > 1
);

-- Step 2: Drop the existing constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Step 3: Add unique constraint on user_id only (one role per user)
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- Add comment
COMMENT ON CONSTRAINT user_roles_user_id_key ON public.user_roles IS 'Each user can only have one role at a time';