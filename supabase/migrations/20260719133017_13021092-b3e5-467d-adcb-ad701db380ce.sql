
-- Recompute analytics windows in America/Bogota timezone
CREATE OR REPLACE FUNCTION public.get_event_analytics_summary(p_event_id uuid, p_time_range text DEFAULT 'today'::text, p_control_type uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_range_start timestamptz;
  v_range_end timestamptz;
  v_tz constant text := 'America/Bogota';
  v_now_local timestamp;
BEGIN
  IF NOT public.user_can_access_event(p_event_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied for event %', p_event_id USING ERRCODE = '42501';
  END IF;

  v_now_local := (now() AT TIME ZONE v_tz);

  IF p_time_range = 'today' THEN
    v_range_start := (date_trunc('day', v_now_local)) AT TIME ZONE v_tz;
    v_range_end := (date_trunc('day', v_now_local) + interval '1 day') AT TIME ZONE v_tz;
  ELSIF p_time_range = 'yesterday' THEN
    v_range_end := (date_trunc('day', v_now_local)) AT TIME ZONE v_tz;
    v_range_start := (date_trunc('day', v_now_local) - interval '1 day') AT TIME ZONE v_tz;
  ELSIF p_time_range = 'week' THEN
    v_range_start := now() - interval '7 days';
    v_range_end := now() + interval '1 second';
  ELSIF p_time_range = 'month' THEN
    v_range_start := now() - interval '30 days';
    v_range_end := now() + interval '1 second';
  ELSE
    v_range_start := 'epoch'::timestamptz;
    v_range_end := now() + interval '1 second';
  END IF;

  WITH
  usage_all AS (
    SELECT
      cu.id,
      cu.used_at,
      cu.control_type_id,
      a.id::text AS subject_id,
      a.category_id,
      a.name AS subject_name,
      cu.device,
      cu.notes,
      'qr'::text AS source
    FROM public.control_usage cu
    JOIN public.attendees a ON a.id = cu.attendee_id
    WHERE a.event_id = p_event_id
    UNION ALL
    SELECT
      ccu.id,
      ccu.used_at,
      ccu.control_type_id,
      ('cedula:' || ccu.numero_cedula) AS subject_id,
      tc.id AS category_id,
      ccu.numero_cedula AS subject_name,
      NULL::text AS device,
      NULL::text AS notes,
      'cedula'::text AS source
    FROM public.cedula_control_usage ccu
    LEFT JOIN public.cedulas_autorizadas ca
      ON ca.event_id = ccu.event_id AND ca.numero_cedula = ccu.numero_cedula
    LEFT JOIN public.ticket_categories tc
      ON tc.event_id = ccu.event_id AND lower(tc.name) = lower(coalesce(ca.categoria, ''))
    WHERE ccu.event_id = p_event_id
  ),
  usage_filtered AS (
    SELECT * FROM usage_all
    WHERE used_at >= v_range_start
      AND used_at < v_range_end
      AND (p_control_type IS NULL OR control_type_id = p_control_type)
      AND (p_category IS NULL OR category_id = p_category)
  ),
  subjects_universe AS (
    SELECT id::text AS subject_id, category_id
    FROM public.attendees WHERE event_id = p_event_id
    UNION
    SELECT ('cedula:' || numero_cedula) AS subject_id,
           (SELECT id FROM public.ticket_categories tc
            WHERE tc.event_id = p_event_id AND lower(tc.name) = lower(coalesce(ca.categoria, '')) LIMIT 1) AS category_id
    FROM public.cedulas_autorizadas ca WHERE event_id = p_event_id
  ),
  kpi_base AS (
    SELECT count(*)::bigint AS total_usages, count(DISTINCT subject_id)::bigint AS unique_attendees FROM usage_filtered
  ),
  totals AS (
    SELECT count(*)::bigint AS total_attendees FROM subjects_universe
  ),
  peak AS (
    SELECT to_char(date_trunc('hour', used_at AT TIME ZONE v_tz), 'HH24:MI') AS hour, count(*)::bigint AS cnt
    FROM usage_filtered GROUP BY 1 ORDER BY cnt DESC LIMIT 1
  ),
  hourly AS (
    SELECT to_char(date_trunc('hour', used_at AT TIME ZONE v_tz), 'HH24:MI') AS hour, count(*)::bigint AS count
    FROM usage_filtered GROUP BY 1 ORDER BY 1
  ),
  daily AS (
    SELECT to_char(date_trunc('day', used_at AT TIME ZONE v_tz), 'YYYY-MM-DD') AS date, count(*)::bigint AS count
    FROM usage_filtered GROUP BY 1 ORDER BY 1
  ),
  control_cov AS (
    SELECT ct.id, ct.name, ct.color,
      coalesce(count(uf.id), 0)::bigint AS total_usages,
      count(DISTINCT uf.subject_id)::bigint AS unique_users
    FROM public.control_types ct
    LEFT JOIN usage_filtered uf ON uf.control_type_id = ct.id
    WHERE ct.event_id = p_event_id
    GROUP BY ct.id, ct.name, ct.color ORDER BY ct.name
  ),
  category_cov AS (
    SELECT tc.id, tc.name, tc.color,
      coalesce((SELECT count(*) FROM subjects_universe s WHERE s.category_id = tc.id), 0)::bigint AS total_attendees,
      coalesce((SELECT count(DISTINCT uf.subject_id) FROM usage_filtered uf WHERE uf.category_id = tc.id), 0)::bigint AS used_attendees
    FROM public.ticket_categories tc
    WHERE tc.event_id = p_event_id ORDER BY tc.name
  ),
  control_by_hour AS (
    SELECT to_char(date_trunc('hour', uf.used_at AT TIME ZONE v_tz), 'HH24:MI') AS hour,
      ct.id AS control_type_id, ct.name AS control_name, ct.color AS control_color,
      count(*)::bigint AS count
    FROM usage_filtered uf
    JOIN public.control_types ct ON ct.id = uf.control_type_id
    GROUP BY 1, 2, 3, 4 ORDER BY 1
  ),
  category_by_hour AS (
    SELECT to_char(date_trunc('hour', uf.used_at AT TIME ZONE v_tz), 'HH24:MI') AS hour,
      tc.id AS category_id, tc.name AS category_name, tc.color AS category_color,
      count(*)::bigint AS count
    FROM usage_filtered uf
    JOIN public.ticket_categories tc ON tc.id = uf.category_id
    GROUP BY 1, 2, 3, 4 ORDER BY 1
  )
  SELECT jsonb_build_object(
    'range_start', v_range_start,
    'range_end', v_range_end,
    'kpis', jsonb_build_object(
      'total_usages', (SELECT total_usages FROM kpi_base),
      'unique_attendees', (SELECT unique_attendees FROM kpi_base),
      'total_attendees', (SELECT total_attendees FROM totals),
      'peak_hour', coalesce((SELECT hour FROM peak), '--'),
      'peak_hour_count', coalesce((SELECT cnt FROM peak), 0)
    ),
    'hourly', coalesce((SELECT jsonb_agg(to_jsonb(h)) FROM hourly h), '[]'::jsonb),
    'daily', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM daily d), '[]'::jsonb),
    'control_coverage', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM control_cov c), '[]'::jsonb),
    'category_coverage', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM category_cov c), '[]'::jsonb),
    'control_type_by_hour', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM control_by_hour c), '[]'::jsonb),
    'category_by_hour', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM category_by_hour c), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
