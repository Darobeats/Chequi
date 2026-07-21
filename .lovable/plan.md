## Objetivo

Transformar el tab **Resumen** en un verdadero cierre de evento: KPIs consolidados, desglose diario (para eventos multi-día), desglose por categoría y por control, y un exportable Excel de cierre para enviar al cliente. Adicionalmente, permitir configurar **fecha inicio** y **fecha fin** del evento.

---

## 1. Configuración: fechas inicio/fin del evento

- Migración: agregar `event_start_date DATE` y `event_end_date DATE` a `event_configs` (mantener `event_date` como legacy y auto-poblarlo con `event_start_date` para no romper vistas actuales).
- `EventConfig.tsx`: reemplazar el input único de fecha por dos date pickers (Inicio / Fin) con validación `fin >= inicio`. Al guardar, si solo hay inicio se copia a fin (evento de 1 día).
- Backfill: setear `event_start_date = event_end_date = event_date` para eventos existentes (incluyendo "Feria Agraria Buga").

## 2. Rediseño del tab Resumen

Nuevo componente `src/components/summary/EventSummaryReport.tsx` que reemplaza el contenido actual (los dos cuadros básicos). Estructura:

- **Encabezado**: nombre del evento, rango de fechas (ej. "18/07/26 – 20/07/26 · 3 días"), estado, generado en hora Bogotá.
- **KPIs de cierre**: Total tickets emitidos · Asistentes únicos · Tasa de asistencia · Total escaneos · Escaneos promedio por asistente · Hora pico global · Día de mayor actividad.
- **Desglose por día** (tabla + mini bar chart): fecha, escaneos, asistentes únicos, hora pico del día. Se genera iterando desde `event_start_date` hasta `event_end_date` en zona Bogotá.
- **Desglose por categoría**: emitidos, asistieron, no-show, tasa %, usos totales.
- **Desglose por tipo de control**: usos, % del total, usuarios únicos.
- **Cédulas (si el evento las usa)**: total autorizados, registrados, tasa, usos por control.
- **Botón "Exportar Resumen (Excel)"** destacado arriba.

Datos: nueva RPC `get_event_summary_report(p_event_id uuid)` que devuelve JSON con todas las secciones anteriores calculadas en Bogotá, cubriendo eventos multi-día (agrupa `control_usage` + `cedula_control_usage` por `date_trunc('day', used_at AT TIME ZONE 'America/Bogota')` acotado al rango del evento).

## 3. Exportable de cierre

Nueva Edge Function `export-event-summary` (basada en `export-attendees-report`) que genera un `.xlsx` con hojas:

1. **PORTADA**: datos del evento, rango, generado por/cuándo, KPIs de cierre.
2. **RESUMEN DIARIO**: una fila por día del evento con métricas.
3. **POR CATEGORÍA**: tabla completa con emitidos/asistieron/no-show/tasa/usos.
4. **POR TIPO DE CONTROL**: usos, %, únicos, por día.
5. **HORA PICO POR DÍA**: distribución horaria de escaneos por cada día del evento.
6. **CÉDULAS** (condicional): resumen de whitelist y usos.
7. **DETALLE DE ACCESOS**: log completo (fecha, hora Bogotá, asistente, categoría, control, dispositivo) — reutiliza la lógica de paginación existente.

Botón se agrega en el header del tab Resumen y llama la edge function con `event_id` del `EventContext`.

## 4. Alcance

- No se toca el tab Análisis (dashboard operativo) ni módulos de tickets/scanner.
- Todos los cálculos temporales usan `src/lib/timezone.ts` (Bogotá).
- Traducciones ES/EN para nuevas etiquetas.

---

## Detalles técnicos

- **Migración SQL**: `ALTER TABLE event_configs ADD COLUMN event_start_date DATE, ADD COLUMN event_end_date DATE;` + backfill + trigger opcional para mantener `event_date = event_start_date`.
- **RPC**: `SECURITY DEFINER`, `search_path = public`, valida acceso vía `user_can_access_event`.
- **Edge function**: valida JWT + `user_can_access_event`, usa `service_role` para leer, `exceljs`, paginación `fetchAll` (como `export-attendees-report`), formato de fechas en Bogotá.
- **Estructura de archivos nuevos**:
  - `src/components/summary/EventSummaryReport.tsx`
  - `src/components/summary/SummaryKpiCards.tsx`
  - `src/components/summary/DailyBreakdownTable.tsx`
  - `src/hooks/useEventSummary.ts`
  - `supabase/functions/export-event-summary/index.ts`
- **Compatibilidad**: `event_date` se mantiene para no romper `get_active_event_config`, `get_user_events`, y componentes que lo leen (`EventConfig.tsx` línea 285, Header, etc.).
