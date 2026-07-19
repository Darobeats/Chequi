
## 1. Zona horaria fija America/Bogota (UTC-5)

Problema: los reportes y agrupaciones "hoy / ayer / por hora" se calculan con la hora del navegador/servidor (UTC en Supabase). A las 19:00 Bogotá ya es 00:00 UTC, por eso las scans se van al "día siguiente" en el informe.

Solución: forzar `America/Bogota` como zona única en TODO el cálculo temporal, sin depender del huso del dispositivo.

### Frontend
- Nuevo helper `src/lib/timezone.ts` con:
  - `APP_TZ = 'America/Bogota'`
  - `nowInBogota()`, `startOfDayBogota(date)`, `endOfDayBogota(date)`, `formatBogota(date, fmt)`, `hourBucketBogota(date)`.
  - Implementación con `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', ... })` (sin nuevas dependencias).
- Reemplazar todos los `new Date()`, `toLocaleDateString`, `getHours()`, `toISOString().split('T')[0]` que agrupen o filtren por fecha en:
  - `src/hooks/useAdvancedAnalytics.ts`
  - `src/hooks/useCedulaRegistros.ts`, `src/hooks/useCedulaControlUsage.ts` (cálculo de "today")
  - `src/components/analytics/*` (KPIs, heatmap, tendencias, feed en vivo)
  - `src/components/ControlAnalytics.tsx`
  - `src/components/ExportButton.tsx` y `src/components/cedula/CedulaExportButton.tsx` (nombres de archivo con fecha)
  - `src/components/analytics/LiveActivityFeed.tsx` y cualquier `toLocaleTimeString` en tarjetas/tablas.

### Backend (RPCs)
- Migración que reescribe `get_event_analytics_summary` y `get_event_recent_activity` para calcular ventanas y buckets en Bogotá:
  - `v_range_start := date_trunc('day', (now() AT TIME ZONE 'America/Bogota'))` y análogos para `yesterday/week/month`, convertidos de vuelta con `AT TIME ZONE 'America/Bogota'` antes de comparar.
  - Todos los `date_trunc('hour'|'day', used_at)` pasan a `date_trunc(..., used_at AT TIME ZONE 'America/Bogota')` y el `to_char` se aplica sobre ese valor.
- Sin cambios de esquema; solo `CREATE OR REPLACE FUNCTION` conservando firma para no romper llamadas.

### Verificación
- Consulta manual comparando conteos "hoy" antes/después con datos de las 19:00-23:59 Bogotá para confirmar que ya aparecen en el día correcto.

## 2. Gestión de QRs en Configuración → QR

Hoy `AttendeeManagement` muestra la lista pero no dice si el QR ya fue usado ni permite acciones masivas. Se amplía sin cambiar la lógica de generación.

### Datos
- Nuevo hook `useAttendeesUsageMap(eventId)` que trae de `control_usage` los `attendee_id` con al menos 1 uso (paginado con `fetchAllPaginated`) y devuelve un `Map<attendeeId, { count, lastUsedAt, controls: string[] }>`.
- Se une en memoria con el listado actual de asistentes.

### UI en `src/components/AttendeeManagement.tsx`
- Columna nueva **Estado QR**: `No usado` (gris) / `Usado` (verde, con tooltip: fecha último uso + controles). Se calcula desde el mapa de uso, no desde `attendee.status` (que puede quedar en "valid").
- Barra de filtros ampliada:
  - Búsqueda actual (nombre / ticket / QR / cédula).
  - Select **Categoría** (multi).
  - Select **Estado QR**: Todos / No usado / Usado.
  - Select **Estado registro**: Todos / Válido / Usado / Bloqueado.
- Selección masiva:
  - Checkbox en header (seleccionar todo lo filtrado, no solo la página).
  - Checkbox por fila. Contador "N seleccionados".
- Acciones masivas (barra flotante cuando hay selección):
  - **Resetear uso de QR** (borra registros de `control_usage` para los seleccionados; ya existe `useResetControlUsage`, se envuelve en un batch con progreso y confirmación).
  - **Regenerar QR** (usa `useRegenerateQRCode` en lote, con advertencia de que invalida QRs ya distribuidos).
  - **Cambiar estado** → Válido / Bloqueado (update masivo con confirmación).
  - **Eliminar** (con doble confirmación, respeta RLS admin).
- Diálogo de confirmación muestra: cantidad afectada, categorías involucradas y advertencias.

### Rendimiento
- Paginación cliente en la tabla (50/100/200) para no renderizar 9.500 filas de golpe; se mantiene selección "todos filtrados" independiente de la página visible.
- Uso de `React.memo` en filas para evitar re-render al marcar checkboxes.

### i18n
- Añadir claves nuevas en `src/i18n/locales/{es,en}/common.json` bajo `eventConfig.qr.*` (estado, filtros, acciones masivas, confirmaciones).

## Archivos a crear / editar

**Crear**
- `src/lib/timezone.ts`
- `src/hooks/useAttendeesUsageMap.ts`
- Migración Supabase: reescritura de `get_event_analytics_summary` y `get_event_recent_activity` con `America/Bogota`.

**Editar**
- `src/hooks/useAdvancedAnalytics.ts`, `useCedulaRegistros.ts`, `useCedulaControlUsage.ts`
- `src/components/analytics/*` (KPIStrip, TrendAnalysis, CategoryHourHeatmap, LiveActivityFeed, DetailedDataTable)
- `src/components/ControlAnalytics.tsx`, `ExportButton.tsx`, `cedula/CedulaExportButton.tsx`
- `src/components/AttendeeManagement.tsx` (rediseño con filtros, selección y acciones masivas)
- `src/i18n/locales/{es,en}/common.json`

## Fuera de alcance
- No se toca la generación de QR ni el payload (los ya distribuidos siguen válidos).
- No se cambia la lógica del scanner ni de los reportes de facturación.
