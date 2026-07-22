
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 1) Add hashed pin storage and backfill from plaintext, then wipe plaintext
ALTER TABLE public.kiosk_profiles ADD COLUMN IF NOT EXISTS pin_hash text;

UPDATE public.kiosk_profiles
SET pin_hash = crypt(require_pin, gen_salt('bf'))
WHERE require_pin IS NOT NULL AND btrim(require_pin) <> '' AND pin_hash IS NULL;

UPDATE public.kiosk_profiles
SET require_pin = NULL
WHERE require_pin IS NOT NULL;

-- Prevent clients from ever reading the legacy plaintext column
REVOKE SELECT (require_pin) ON public.kiosk_profiles FROM anon, authenticated;
-- Also block direct writes to pin_hash from clients; only RPC may write it
REVOKE INSERT (pin_hash), UPDATE (pin_hash) ON public.kiosk_profiles FROM anon, authenticated;

-- 2) Server-side PIN verification (never returns the hash)
CREATE OR REPLACE FUNCTION public.verify_kiosk_pin(_profile_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
  v_hash text;
BEGIN
  SELECT event_id, pin_hash INTO v_event_id, v_hash
  FROM public.kiosk_profiles
  WHERE id = _profile_id;

  IF v_event_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.user_can_access_event(v_event_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied for event %', v_event_id USING ERRCODE = '42501';
  END IF;

  IF v_hash IS NULL OR _pin IS NULL OR length(_pin) = 0 THEN
    RETURN v_hash IS NULL;
  END IF;

  RETURN v_hash = crypt(_pin, v_hash);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_kiosk_pin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_kiosk_pin(uuid, text) TO authenticated;

-- 3) Server-side PIN setter (admins/team managers only)
CREATE OR REPLACE FUNCTION public.set_kiosk_pin(_profile_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT event_id INTO v_event_id FROM public.kiosk_profiles WHERE id = _profile_id;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Kiosk profile not found';
  END IF;

  IF NOT (public.can_modify_data(auth.uid()) OR public.can_manage_event_team(v_event_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to set kiosk PIN' USING ERRCODE = '42501';
  END IF;

  IF _pin IS NULL OR btrim(_pin) = '' THEN
    UPDATE public.kiosk_profiles SET pin_hash = NULL, require_pin = NULL WHERE id = _profile_id;
  ELSE
    UPDATE public.kiosk_profiles
    SET pin_hash = crypt(_pin, gen_salt('bf')), require_pin = NULL
    WHERE id = _profile_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_kiosk_pin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_kiosk_pin(uuid, text) TO authenticated;

-- 4) Scope the cedula usage-limit RPC to event members only
CREATE OR REPLACE FUNCTION public.check_cedula_control_limit(p_event_id uuid, p_numero_cedula text, p_control_type_id uuid)
 RETURNS TABLE(can_access boolean, current_uses bigint, max_uses integer, error_message text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.user_can_access_event(p_event_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied for event %', p_event_id USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH usage_count AS (
    SELECT COUNT(*) as uses
    FROM public.cedula_control_usage
    WHERE event_id = p_event_id
      AND numero_cedula = p_numero_cedula
      AND control_type_id = p_control_type_id
  ),
  category_limit AS (
    SELECT COALESCE(cc.max_uses, 1) as max_uses
    FROM public.cedulas_autorizadas ca
    JOIN public.ticket_categories tc ON LOWER(tc.name) = LOWER(ca.categoria)
    JOIN public.category_controls cc ON cc.category_id = tc.id AND cc.control_type_id = p_control_type_id
    WHERE ca.event_id = p_event_id AND ca.numero_cedula = p_numero_cedula
    LIMIT 1
  )
  SELECT
    CASE
      WHEN cl.max_uses IS NULL THEN true
      WHEN uc.uses >= cl.max_uses THEN false
      ELSE true
    END as can_access,
    COALESCE(uc.uses, 0) as current_uses,
    COALESCE(cl.max_uses, 0) as max_uses,
    CASE
      WHEN cl.max_uses IS NULL THEN 'Sin límite configurado'
      WHEN uc.uses >= cl.max_uses THEN 'Límite de usos alcanzado (' || uc.uses || '/' || cl.max_uses || ')'
      ELSE 'Acceso permitido (' || uc.uses || '/' || cl.max_uses || ')'
    END as error_message
  FROM usage_count uc
  CROSS JOIN (SELECT COALESCE((SELECT max_uses FROM category_limit), NULL) as max_uses) cl;
END;
$function$;
