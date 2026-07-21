-- 1. Add start/end date columns
ALTER TABLE public.event_configs
  ADD COLUMN IF NOT EXISTS event_start_date DATE,
  ADD COLUMN IF NOT EXISTS event_end_date DATE;

-- 2. Backfill from legacy event_date
UPDATE public.event_configs
   SET event_start_date = COALESCE(event_start_date, event_date),
       event_end_date   = COALESCE(event_end_date, event_date)
 WHERE event_start_date IS NULL OR event_end_date IS NULL;

-- 3. Keep legacy event_date synced with start date (for backward compatibility)
CREATE OR REPLACE FUNCTION public.sync_event_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.event_start_date IS NOT NULL THEN
    NEW.event_date := NEW.event_start_date;
  END IF;
  IF NEW.event_end_date IS NULL AND NEW.event_start_date IS NOT NULL THEN
    NEW.event_end_date := NEW.event_start_date;
  END IF;
  IF NEW.event_start_date IS NOT NULL
     AND NEW.event_end_date IS NOT NULL
     AND NEW.event_end_date < NEW.event_start_date THEN
    RAISE EXCEPTION 'event_end_date (%) cannot be earlier than event_start_date (%)',
      NEW.event_end_date, NEW.event_start_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_event_dates ON public.event_configs;
CREATE TRIGGER trg_sync_event_dates
BEFORE INSERT OR UPDATE OF event_start_date, event_end_date, event_date
ON public.event_configs
FOR EACH ROW EXECUTE FUNCTION public.sync_event_dates();

-- 4. Summary RPC used by the Resumen tab and export
CREATE OR REPLACE FUNCTION public.get_event_summary_report(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_tz constant text := 'America/Bogota';
  v_start date;
  v_end   date;
BEGIN
  IF NOT public.user_can_access_event(p_event_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied for event %', p_event_id USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(event_start_date, event_date),
         COALESCE(event_end_date, event_start_date, event_date)
    INTO v_start, v_end
    FROM public.event_configs WHERE id = p_event_id;

  WITH
  usage_all AS (
    SELECT cu.id, cu.used_at, cu.control_type_id, a.id::text AS subject_id, a.category_id
    FROM public.control_usage cu
    JOIN public.attendees a ON a.id = cu.attendee_id
    WHERE a.event_id = p_event_id
    UNION ALL
    SELECT ccu.id, ccu.used_at, ccu.control_type_id,
           ('cedula:' || ccu.numero_cedula) AS subject_id,
           tc.id AS category_id
    FROM public.cedula_control_usage ccu
    LEFT JOIN public.cedulas_autorizadas ca
      ON ca.event_id = ccu.event_id AND ca.numero_cedula = ccu.numero_cedula
    LEFT JOIN public.ticket_categories tc
      ON tc.event_id = ccu.event_id AND lower(tc.name) = lower(coalesce(ca.categoria, ''))
    WHERE ccu.event_id = p_event_id
  ),
  attendees_set AS (
    SELECT id::text AS subject_id, category_id FROM public.attendees WHERE event_id = p_event_id
  ),
  kpi AS (
    SELECT
      (SELECT count(*) FROM attendees_set)::bigint AS total_tickets,
      (SELECT count(DISTINCT subject_id) FROM usage_all WHERE subject_id IN (SELECT subject_id FROM attendees_set))::bigint AS unique_attendees,
      (SELECT count(*) FROM usage_all)::bigint AS total_scans
  ),
  daily AS (
    SELECT
      to_char((used_at AT TIME ZONE v_tz)::date, 'YYYY-MM-DD') AS day,
      count(*)::bigint AS scans,
      count(DISTINCT subject_id)::bigint AS unique_subjects
    FROM usage_all
    GROUP BY 1
    ORDER BY 1
  ),
  daily_peak AS (
    SELECT
      to_char((used_at AT TIME ZONE v_tz)::date, 'YYYY-MM-DD') AS day,
      to_char(date_trunc('hour', used_at AT TIME ZONE v_tz), 'HH24:MI') AS hour,
      count(*)::bigint AS cnt
    FROM usage_all
    GROUP BY 1, 2
  ),
  daily_with_peak AS (
    SELECT d.day, d.scans, d.unique_subjects,
      (SELECT hour FROM daily_peak p WHERE p.day = d.day ORDER BY cnt DESC LIMIT 1) AS peak_hour,
      (SELECT cnt  FROM daily_peak p WHERE p.day = d.day ORDER BY cnt DESC LIMIT 1) AS peak_count
    FROM daily d
  ),
  category_break AS (
    SELECT
      tc.id, tc.name, tc.color,
      (SELECT count(*) FROM attendees_set s WHERE s.category_id = tc.id)::bigint AS issued,
      (SELECT count(DISTINCT u.subject_id) FROM usage_all u
         WHERE u.category_id = tc.id AND u.subject_id IN (SELECT subject_id FROM attendees_set))::bigint AS attended,
      (SELECT count(*) FROM usage_all u WHERE u.category_id = tc.id)::bigint AS uses
    FROM public.ticket_categories tc
    WHERE tc.event_id = p_event_id
    ORDER BY tc.name
  ),
  control_break AS (
    SELECT ct.id, ct.name, ct.color,
      (SELECT count(*) FROM usage_all u WHERE u.control_type_id = ct.id)::bigint AS uses,
      (SELECT count(DISTINCT u.subject_id) FROM usage_all u WHERE u.control_type_id = ct.id)::bigint AS unique_users
    FROM public.control_types ct
    WHERE ct.event_id = p_event_id
    ORDER BY ct.name
  ),
  hourly_by_day AS (
    SELECT
      to_char((used_at AT TIME ZONE v_tz)::date, 'YYYY-MM-DD') AS day,
      to_char(date_trunc('hour', used_at AT TIME ZONE v_tz), 'HH24:MI') AS hour,
      count(*)::bigint AS cnt
    FROM usage_all
    GROUP BY 1, 2 ORDER BY 1, 2
  ),
  peak_global AS (
    SELECT hour, cnt FROM (
      SELECT to_char(date_trunc('hour', used_at AT TIME ZONE v_tz), 'HH24:MI') AS hour, count(*)::bigint AS cnt
      FROM usage_all GROUP BY 1
    ) x ORDER BY cnt DESC LIMIT 1
  ),
  best_day AS (
    SELECT day, scans FROM daily ORDER BY scans DESC LIMIT 1
  ),
  cedula_totals AS (
    SELECT
      (SELECT count(*) FROM public.cedulas_autorizadas WHERE event_id = p_event_id)::bigint AS authorized,
      (SELECT count(DISTINCT numero_cedula) FROM public.cedula_control_usage WHERE event_id = p_event_id)::bigint AS registered,
      (SELECT count(*) FROM public.cedula_control_usage WHERE event_id = p_event_id)::bigint AS scans
  )
  SELECT jsonb_build_object(
    'event_id', p_event_id,
    'start_date', v_start,
    'end_date', v_end,
    'kpis', jsonb_build_object(
      'total_tickets', (SELECT total_tickets FROM kpi),
      'unique_attendees', (SELECT unique_attendees FROM kpi),
      'total_scans', (SELECT total_scans FROM kpi),
      'attendance_rate', CASE WHEN (SELECT total_tickets FROM kpi) > 0
        THEN round(((SELECT unique_attendees FROM kpi)::numeric / (SELECT total_tickets FROM kpi)::numeric) * 100, 1)
        ELSE 0 END,
      'avg_scans_per_attendee', CASE WHEN (SELECT unique_attendees FROM kpi) > 0
        THEN round((SELECT total_scans FROM kpi)::numeric / (SELECT unique_attendees FROM kpi)::numeric, 2)
        ELSE 0 END,
      'peak_hour', COALESCE((SELECT hour FROM peak_global), '--'),
      'peak_hour_count', COALESCE((SELECT cnt FROM peak_global), 0),
      'best_day', COALESCE((SELECT day FROM best_day), null),
      'best_day_count', COALESCE((SELECT scans FROM best_day), 0)
    ),
    'daily', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM daily_with_peak d), '[]'::jsonb),
    'by_category', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM category_break c), '[]'::jsonb),
    'by_control', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM control_break c), '[]'::jsonb),
    'hourly_by_day', COALESCE((SELECT jsonb_agg(to_jsonb(h)) FROM hourly_by_day h), '[]'::jsonb),
    'cedula', jsonb_build_object(
      'authorized', (SELECT authorized FROM cedula_totals),
      'registered', (SELECT registered FROM cedula_totals),
      'scans', (SELECT scans FROM cedula_totals)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_event_summary_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_summary_report(uuid) TO authenticated, service_role;