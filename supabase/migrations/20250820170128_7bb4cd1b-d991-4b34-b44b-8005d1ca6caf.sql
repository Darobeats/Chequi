-- Fix attendee lookup functions by dropping and recreating without company column

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.find_attendee_by_ticket(text);
DROP FUNCTION IF EXISTS public.find_attendee_by_ticket_public(text);

-- Recreate secure function (authenticated context)
CREATE OR REPLACE FUNCTION public.find_attendee_by_ticket(ticket_id text)
RETURNS TABLE(
  id uuid,
  ticket_id text,
  name text,
  email text,
  category_id uuid,
  status text,
  qr_code text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    a.id,
    a.ticket_id,
    a.name,
    a.email,
    a.category_id,
    a.status,
    a.qr_code,
    a.created_at,
    a.updated_at
  FROM public.attendees a
  WHERE a.qr_code = $1 OR a.ticket_id = $1
  LIMIT 1;
$function$;

-- Recreate public-safe function used by Edge Function
CREATE OR REPLACE FUNCTION public.find_attendee_by_ticket_public(ticket_id text)
RETURNS TABLE(
  id uuid,
  ticket_id text,
  name text,
  email text,
  category_id uuid,
  status text,
  qr_code text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    a.id,
    a.ticket_id,
    a.name,
    a.email,
    a.category_id,
    a.status,
    a.qr_code,
    a.created_at,
    a.updated_at
  FROM public.attendees a
  WHERE a.qr_code = $1 OR a.ticket_id = $1
  LIMIT 1;
$function$;