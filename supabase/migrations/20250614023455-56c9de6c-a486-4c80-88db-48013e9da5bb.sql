
-- Create indexes for foreign key constraints to improve performance

-- Index for attendees.category_id foreign key
CREATE INDEX IF NOT EXISTS idx_attendees_category_id ON public.attendees(category_id);

-- Index for control_usage.attendee_id foreign key
CREATE INDEX IF NOT EXISTS idx_control_usage_attendee_id ON public.control_usage(attendee_id);

-- Index for control_usage.control_type_id foreign key
CREATE INDEX IF NOT EXISTS idx_control_usage_control_type_id ON public.control_usage(control_type_id);

-- Index for category_controls.category_id foreign key
CREATE INDEX IF NOT EXISTS idx_category_controls_category_id ON public.category_controls(category_id);

-- Index for category_controls.control_type_id foreign key
CREATE INDEX IF NOT EXISTS idx_category_controls_control_type_id ON public.category_controls(control_type_id);

-- Index for qr_templates.category_id foreign key
CREATE INDEX IF NOT EXISTS idx_qr_templates_category_id ON public.qr_templates(category_id);

-- Additional performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendees_status ON public.attendees(status);
CREATE INDEX IF NOT EXISTS idx_attendees_ticket_id ON public.attendees(ticket_id);
CREATE INDEX IF NOT EXISTS idx_attendees_qr_code ON public.attendees(qr_code);
CREATE INDEX IF NOT EXISTS idx_control_usage_used_at ON public.control_usage(used_at);
CREATE INDEX IF NOT EXISTS idx_event_configs_is_active ON public.event_configs(is_active);
