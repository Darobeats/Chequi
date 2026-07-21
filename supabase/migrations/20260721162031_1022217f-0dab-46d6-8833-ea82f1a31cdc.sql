
CREATE OR REPLACE FUNCTION public.get_event_summary_report(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tz constant text := 'America/Bogota';
  v_result jsonb;
BEGIN
  IF NOT public.user_can_access_event(p_event_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied for event %', p_event_id USING ERRCODE = '42501';
  END IF;

  WITH
  ev AS (
    SELECT event_start_date, event_end_date, event_date
    FROM public.event_configs WHERE id = p_event_id
  ),
  usage_all AS (
    SELECT
      cu.id,
      cu.used_at,
      cu.control_type_id,
      a.id::text AS subject_id,
      a.category_id
    FROM public.control_usage cu
    JOIN public.attendees a ON a.id = cu.attendee_id
    WHERE a.event_id = p_event_id
    UNION ALL
    SELECT
      ccu.id,
      ccu.used_at,
      ccu.control_type_id,
      ('cedula:' || ccu.numero_cedula) AS subject_id,
      tc.id AS category_id
    FROM public.cedula_control_usage ccu
    LEFT JOIN public.cedulas_autorizadas ca
      ON ca.event_id = ccu.event_id AND ca.numero_cedula = ccu.numero_cedula
    LEFT JOIN public.ticket_categories tc
      ON tc.event_id = ccu.event_id AND lower(tc.name) = lower(coalesce(ca.categoria, ''))
    WHERE ccu.event_id = p_event_id
  ),
  totals AS (
    SELECT
      (SELECT count(*) FROM public.attendees WHERE event_id = p_event_id)::bigint AS total_tickets,
      (SELECT count(*) FROM usage_all)::bigint AS total_scans,
      (SELECT count(DISTINCT subject_id) FROM usage_all)::bigint AS unique_attendees
  ),
  peak_global AS (
    SELECT to_char(date_trunc('hour', used_at AT TIME ZONE v_tz), 'HH24:MI') AS hour, count(*)::bigint AS cnt
    FROM usage_all GROUP BY 1 ORDER BY cnt DESC LIMIT 1
  ),
  daily_raw AS (
    SELECT
      to_char(date_trunc('day', used_at AT TIME ZONE v_tz), 'YYYY-MM-DD') AS day,
      count(*)::bigint AS scans,
      count(DISTINCT subject_id)::bigint AS unique_subjects
    FROM usage_all GROUP BY 1
  ),
  peak_by_day AS (
    SELECT day, hour, cnt FROM (
      SELECT
        to_char(date_trunc('day', used_at AT TIME ZONE v_tz), 'YYYY-MM-DD') AS day,
        to_char(date_trunc('hour', used_at AT TIME ZONE v_tz), 'HH24:MI') AS hour,
        count(*)::bigint AS cnt,
        row_number() OVER (
          PARTITION BY to_char(date_trunc('day', used_at AT TIME ZONE v_tz), 'YYYY-MM-DD')
          ORDER BY count(*) DESC
        ) AS rn
      FROM usage_all
      GROUP BY 1, 2
    ) t WHERE rn = 1
  ),
  daily AS (
    SELECT d.day, d.scans, d.unique_subjects, p.hour AS peak_hour, p.cnt AS peak_count
    FROM daily_raw d
    LEFT JOIN peak_by_day p ON p.day = d.day
    ORDER BY d.day
  ),
  best_day AS (
    SELECT day, scans FROM daily_raw ORDER BY scans DESC LIMIT 1
  ),
  by_category AS (
    SELECT
      tc.id, tc.name, tc.color,
      (SELECT count(*) FROM public.attendees a WHERE a.event_id = p_event_id AND a.category_id = tc.id)::bigint AS issued,
      (SELECT count(DISTINCT ua.subject_id) FROM usage_all ua WHERE ua.category_id = tc.id)::bigint AS attended,
      (SELECT count(*) FROM usage_all ua WHERE ua.category_id = tc.id)::bigint AS uses
    FROM public.ticket_categories tc
    WHERE tc.event_id = p_event_id
    ORDER BY tc.name
  ),
  by_control AS (
    SELECT
      ct.id, ct.name, ct.color,
      coalesce((SELECT count(*) FROM usage_all ua WHERE ua.control_type_id = ct.id), 0)::bigint AS uses,
      coalesce((SELECT count(DISTINCT ua.subject_id) FROM usage_all ua WHERE ua.control_type_id = ct.id), 0)::bigint AS unique_users
    FROM public.control_types ct
    WHERE ct.event_id = p_event_id
    ORDER BY ct.name
  ),
  hourly_by_day AS (
    SELECT
      to_char(date_trunc('day', used_at AT TIME ZONE v_tz), 'YYYY-MM-DD') AS day,
      to_char(date_trunc('hour', used_at AT TIME ZONE v_tz), 'HH24:MI') AS hour,
      count(*)::bigint AS cnt
    FROM usage_all GROUP BY 1, 2 ORDER BY 1, 2
  ),
  cedula_stats AS (
    SELECT
      (SELECT count(*) FROM public.cedulas_autorizadas WHERE event_id = p_event_id)::bigint AS authorized,
      (SELECT count(*) FROM public.cedula_registros WHERE event_id = p_event_id)::bigint AS registered,
      (SELECT count(*) FROM public.cedula_control_usage WHERE event_id = p_event_id)::bigint AS scans
  )
  SELECT jsonb_build_object(
    'event_id', p_event_id,
    'start_date', (SELECT coalesce(event_start_date, event_date) FROM ev),
    'end_date',   (SELECT coalesce(event_end_date, event_start_date, event_date) FROM ev),
    'kpis', jsonb_build_object(
      'total_tickets', (SELECT total_tickets FROM totals),
      'unique_attendees', (SELECT unique_attendees FROM totals),
      'total_scans', (SELECT total_scans FROM totals),
      'attendance_rate', CASE WHEN (SELECT total_tickets FROM totals) > 0
        THEN round(((SELECT unique_attendees FROM totals)::numeric / (SELECT total_tickets FROM totals)::numeric) * 100, 1)
        ELSE 0 END,
      'avg_scans_per_attendee', CASE WHEN (SELECT unique_attendees FROM totals) > 0
        THEN round((SELECT total_scans FROM totals)::numeric / (SELECT unique_attendees FROM totals)::numeric, 2)
        ELSE 0 END,
      'peak_hour', coalesce((SELECT hour FROM peak_global), '--'),
      'peak_hour_count', coalesce((SELECT cnt FROM peak_global), 0),
      'best_day', (SELECT day FROM best_day),
      'best_day_count', coalesce((SELECT scans FROM best_day), 0)
    ),
    'daily', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM daily d), '[]'::jsonb),
    'by_category', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM by_category c), '[]'::jsonb),
    'by_control', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM by_control c), '[]'::jsonb),
    'hourly_by_day', coalesce((SELECT jsonb_agg(to_jsonb(h)) FROM hourly_by_day h), '[]'::jsonb),
    'cedula', (SELECT to_jsonb(cs) FROM cedula_stats cs)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_event_summary_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_summary_report(uuid) TO authenticated;
