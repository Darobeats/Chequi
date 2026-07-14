# Auditoría técnica — Evento de ~9.500 asistentes / 2 días

Fecha: 2026-07-14

## Resumen ejecutivo

Ejes revisados: rendimiento con dataset grande, sincronía editor↔exportación, capacidad offline, seguridad de RLS y edge functions, código muerto.

Ya aplicado en este pase (build mode):
1. **Centro de Exportación** — límite duro de 1000 filas eliminado; tabla virtualizada; ZIPs por lotes (250/500/1000/2000/5000) para no colapsar la pestaña con 9.500 PNG.
2. **Query de asistentes en `EventConfig`** — antes hacía `select().order()` sin `.range()` → PostgREST devolvía **máximo 1000 filas** (bug crítico: el resto de asistentes no llegaba al centro de exportación). Ahora usa `fetchAllPaginated` y filtra por `event_id`.
3. **Sincronía editor ↔ ticket exportado**:
   - `document.fonts.ready` esperado antes de renderizar.
   - Fabric `Text` fuerza `lineHeight: 1` y `charSpacing: 0`.
   - `renderTicket` respeta `textAlign` (left/center/right) y aplica un `yAdjust = fontSize*0.03` para compensar las métricas internas de Fabric.
4. **Índices de base de datos** creados vía migración para escaneo, límites y reportes:
   - `attendees(event_id, qr_code)`, `attendees(event_id, ticket_id)`, `attendees(event_id, category_id)`
   - `control_usage(attendee_id, control_type_id)`, `control_usage(used_at DESC)`
   - `cedula_control_usage(event_id, numero_cedula, control_type_id)`, `cedula_control_usage(event_id, used_at DESC)`
   - `cedulas_autorizadas(event_id, numero_cedula)`, `cedula_access_logs(event_id, created_at DESC)`
   - `ticket_categories(event_id)`, `control_types(event_id)`, `category_controls(control_type_id)`

## Hallazgos pendientes por severidad

### ALTO

- **Supabase linter** reporta 60 warnings sobre `SECURITY DEFINER` ejecutables por `anon`. La mayoría son **intencionales** para flujos públicos de escaneo (`find_attendee_by_ticket_public`, `validate_control_access_public`, `get_active_event_config`, `get_active_event_id`). Revocar `EXECUTE` a `anon` en las funciones internas que no lo requieran (`has_role`, `get_user_role`, `can_access_scanner`, `can_access_dashboard`, `can_modify_data`, `get_current_user_role`, `user_has_role_secure`, `get_user_role_secure`) es una mejora pendiente sin impacto operativo antes del evento.
- **Precarga offline** (`useOfflinePrecharge`) mete 9.500 asistentes en una sola transacción IndexedDB. Recomendado: trocear `putAttendees` en lotes de 2.000 y liberar el event loop entre cada uno.

### MEDIO

- `export-attendees-report` edge function: probar con 9.500 filas; si supera 60s cambiar a `stream.xlsx.WorkbookWriter` de ExcelJS.
- `LiveActivityFeed` y otras consultas de analytics: fijar `staleTime: 30_000` en React Query para evitar re-fetches masivos con 50-100 controladores conectados.
- Duplicación: `useAttendeeManagement` vs `useAttendeesPage`, `AttendeeManagement` vs `AttendeesManager` — candidatos a consolidar tras el evento.
- Helper de paginación duplicado en `useOfflinePrecharge` y `src/lib/fetchAllPaginated.ts` — unificar.

### BAJO

- `mockData.ts` sin usos aparentes — candidato a eliminación.
- Un `TableCell` con `colSpan` mostrando el mensaje de "Mostrando 1000 de X" ya fue eliminado; conservar comentario explicativo para futuros mantenedores.

## Recomendaciones operacionales para el día del evento

1. **Precargar offline** en cada dispositivo controlador la noche anterior (Whitelist + attendees + control types).
2. Distribuir tickets en **múltiples ZIP** (batch 1000). Descargar en horario de baja carga.
3. Habilitar **Kiosk mode** con Wake Lock en tablets de acceso principal.
4. Mantener **service_role_key** solo en secretos de edge functions; ya verificado que no aparece en frontend.
5. Post-evento: correr `security--run_security_scan` completo y aplicar revoke a las funciones definer internas.

## Verificación

- Migración de índices aplicada: OK.
- Build TS: OK tras las ediciones (virtualización + fetchAllPaginated + textAlign).
- Sincronía editor↔export: eliminado el desfase vertical/alineación observado; texto centrado ahora sale centrado en el PNG.
