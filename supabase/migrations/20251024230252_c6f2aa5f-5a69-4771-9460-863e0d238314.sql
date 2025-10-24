-- Add unique index on event_id + ticket_id to support reliable upserts
CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendees_event_ticket 
ON public.attendees(event_id, ticket_id);