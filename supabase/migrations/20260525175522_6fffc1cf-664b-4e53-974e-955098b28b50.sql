
-- Restrict Realtime channel subscriptions via RLS on realtime.messages.
-- Convention: clients subscribe to topic 'attendees:event:<event_id>'.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read assigned event attendee topics" ON realtime.messages;
CREATE POLICY "Authenticated can read assigned event attendee topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'attendees:event:%')
  AND public.user_can_access_event(
    NULLIF(split_part(realtime.topic(), ':', 3), '')::uuid,
    auth.uid()
  )
);
