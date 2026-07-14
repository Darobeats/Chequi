-- Indexes to support ~9.500-attendee events and multi-day scanning peaks.
CREATE INDEX IF NOT EXISTS idx_attendees_event_qr
  ON public.attendees(event_id, qr_code);
CREATE INDEX IF NOT EXISTS idx_attendees_event_ticket
  ON public.attendees(event_id, ticket_id);
CREATE INDEX IF NOT EXISTS idx_attendees_event_category
  ON public.attendees(event_id, category_id);

CREATE INDEX IF NOT EXISTS idx_control_usage_attendee_type
  ON public.control_usage(attendee_id, control_type_id);
CREATE INDEX IF NOT EXISTS idx_control_usage_used_at
  ON public.control_usage(used_at DESC);

CREATE INDEX IF NOT EXISTS idx_ccu_event_ced_type
  ON public.cedula_control_usage(event_id, numero_cedula, control_type_id);
CREATE INDEX IF NOT EXISTS idx_ccu_event_used_at
  ON public.cedula_control_usage(event_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_cedulas_autorizadas_event_ced
  ON public.cedulas_autorizadas(event_id, numero_cedula);
CREATE INDEX IF NOT EXISTS idx_cedula_access_logs_event_time
  ON public.cedula_access_logs(event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_categories_event
  ON public.ticket_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_control_types_event
  ON public.control_types(event_id);
CREATE INDEX IF NOT EXISTS idx_category_controls_type
  ON public.category_controls(control_type_id);