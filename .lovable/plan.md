## Causa raíz

La pestaña **Resumen** (dentro de `ControlAnalytics.tsx`, en Admin → Analytics) está cableada únicamente a las tablas QR clásicas:

- `useControlUsage()` → tabla `control_usage` (escaneos de tickets QR)
- `useAttendees()` → tabla `attendees`
- `useUsageCounters()` → contadores QR

En los eventos actuales del cliente el flujo es **por cédula** (`cedula_registros`, `cedula_control_usage`, `cedula_access_logs`). Como no hay filas en `control_usage` ni en `attendees` para esos eventos, todos los KPIs, series temporales, distribución horaria, cobertura y actividad en vivo aparecen vacíos. Además, `useControlUsage` solo hace polling cada 5s y no escucha realtime; ninguna invalidación se dispara al insertar una cédula.

## Solución

Unificar la fuente de datos del módulo de analítica para que combine QR + cédula, y agregar realtime sobre las tablas de cédula para que la pestaña Resumen se actualice al instante.

### Cambios

1. **`src/hooks/useAdvancedAnalytics.ts`**
   - Leer también `cedula_control_usage` y `cedula_registros` del evento activo (con paginación `fetchAllPaginated`).
   - Normalizar cada registro de cédula al mismo shape que `control_usage` esperado por el hook:
     - `used_at` ← `used_at` (consumo) o `scanned_at` (registro de acceso, mapeado contra el control "Ingreso/Entrada/Acceso" del evento).
     - `control_type_id` ← `control_type_id` o el del control de ingreso.
     - `attendee_id` ← `numero_cedula` (string como identificador único).
     - `attendee.category_id` ← se resuelve buscando la categoría en `cedulas_autorizadas` (por `numero_cedula`) y mapeando contra `ticket_categories` por nombre (LOWER). Si no hay match, se deja `null` y solo afecta filtros por categoría.
   - `filteredData` pasa a ser la unión `[...controlUsage, ...cedulaUsageNormalizada]`.
   - `enhancedMetrics`:
     - `totalUsages` y `uniqueAttendees` se calculan desde `filteredData` (QR + cédula) cuando hay datos de cédula presentes, en vez de usar solo `useUsageCounters`. Mantener fallback al contador QR si no hay cédula.
     - `totalAttendees` suma `attendees.length + cedulasAutorizadas.length` cuando exista whitelist; si no, deja `attendees.length`.
   - Resto de cálculos (timeSeries, hourlyDistribution, coverageAnalysis, intradayInsights, recentActivity) ya operan sobre `filteredData`, así que pasan a reflejar también las cédulas sin más cambios.

2. **Realtime en analytics** — añadir al inicio de `useAdvancedAnalytics` un `useEffect` que, para el `selectedEvent.id` activo, se suscriba a un canal único `analytics-realtime-${eventId}` con `postgres_changes *` sobre:
   - `control_usage`
   - `attendees`
   - `cedula_control_usage` (filtro `event_id=eq.${eventId}`)
   - `cedula_registros` (filtro `event_id=eq.${eventId}`)
   - `cedula_access_logs` (filtro `event_id=eq.${eventId}`)
   
   En cada evento invalida `['control_usage', eventId]`, `['attendees', eventId]`, `['cedula_control_usage', eventId]`, `['cedula_registros', eventId]`, `['cedula_access_logs', eventId]`, `['cedulas_autorizadas', eventId]`. Cleanup con `supabase.removeChannel`.

3. **Bajar el `refetchInterval` de `useControlUsage`** de 5000 ms a `false` (ya tendremos realtime), evitando llamadas innecesarias.

### Fuera de alcance

- No se modifican tablas ni RLS. Las tres tablas `cedula_*` ya están en `supabase_realtime` (migración previa).
- No se toca `CedulaDashboardMonitor` ni `CedulaControlAnalytics` (ya andan en realtime).
- No se cambia la UI ni los textos de las pestañas.

## Verificación

Tras implementar, confirmar en preview con un evento por cédula:
1. La pestaña **Resumen** muestra KPIs > 0 (Consumos totales, Cédulas únicas, Tasa de participación si hay whitelist).
2. **Tendencias** dibuja la línea horaria con los escaneos del día.
3. **Cobertura** lista los controles con `totalUsages` y `uniqueUsers` correctos.
4. **En Vivo** y la actividad de `CedulaControlAnalytics` muestran las últimas cédulas.
5. Al escanear una nueva cédula, los conteos cambian en **menos de 2 segundos** sin recargar.