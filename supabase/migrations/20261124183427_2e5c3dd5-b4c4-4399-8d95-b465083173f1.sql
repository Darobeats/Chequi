ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS import_batch text;
CREATE INDEX IF NOT EXISTS idx_attendees_event_import_batch ON public.attendees(event_id, import_batch);