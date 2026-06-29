-- Fix incorrect UUID extraction in realtime policies for hyphen-named topics.
DROP POLICY IF EXISTS "Authenticated can read assigned event cedula-realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can read assigned event analytics-realtime topics" ON realtime.messages;

CREATE POLICY "Authenticated can read assigned event cedula-realtime topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'cedula-realtime-%'
  AND public.user_can_access_event(
    (NULLIF(substring(realtime.topic() FROM '^cedula-realtime-(.+)$'), ''))::uuid,
    auth.uid()
  )
);

CREATE POLICY "Authenticated can read assigned event analytics-realtime topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'analytics-realtime-%'
  AND public.user_can_access_event(
    (NULLIF(substring(realtime.topic() FROM '^analytics-realtime-(.+)$'), ''))::uuid,
    auth.uid()
  )
);