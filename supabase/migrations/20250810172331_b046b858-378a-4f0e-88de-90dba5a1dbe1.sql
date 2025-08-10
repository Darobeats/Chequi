-- Remove company column from attendees table
ALTER TABLE public.attendees DROP COLUMN IF EXISTS company;