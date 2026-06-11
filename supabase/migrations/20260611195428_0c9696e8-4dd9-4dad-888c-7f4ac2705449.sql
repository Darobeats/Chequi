CREATE POLICY "Authenticated can read assigned event cedula_registros topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'cedula_registros:event:%'
  AND public.user_can_access_event((NULLIF(split_part(realtime.topic(), ':', 3), ''))::uuid, auth.uid())
);

CREATE POLICY "Authenticated can read assigned event cedula_access_logs topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'cedula_access_logs:event:%'
  AND public.user_can_access_event((NULLIF(split_part(realtime.topic(), ':', 3), ''))::uuid, auth.uid())
);

CREATE POLICY "Authenticated can read assigned event cedula_control_usage topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'cedula_control_usage:event:%'
  AND public.user_can_access_event((NULLIF(split_part(realtime.topic(), ':', 3), ''))::uuid, auth.uid())
);

CREATE POLICY "Authenticated can read assigned event cedula-realtime topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'cedula-realtime-%'
  AND public.user_can_access_event((NULLIF(split_part(realtime.topic(), '-', 3), ''))::uuid, auth.uid())
);

CREATE POLICY "Authenticated can read assigned event analytics-realtime topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'analytics-realtime-%'
  AND public.user_can_access_event((NULLIF(split_part(realtime.topic(), '-', 3), ''))::uuid, auth.uid())
);