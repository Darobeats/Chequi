## Objetivo

Tres mejoras enfocadas: exportación de Asistentes en el servidor, bindings de plantillas por categoría (invitados/socios), y verificación del dashboard "Análisis" en tiempo real con desglose por categoría.

---

### 1. Exportación de Asistentes → Edge Function (servidor)

**Problema:** `ExportButton.tsx` descarga TODOS los `attendees` + `controlUsage` al navegador y arma el Excel en la UI. Con 8–10k asistentes bloquea el dashboard.

**Solución:**
- Nueva Edge Function `export-attendees-report`:
  - Recibe `{ event_id }`, valida sesión y permisos vía `user_can_access_event`.
  - Usa `SUPABASE_SERVICE_ROLE_KEY` internamente + paginación server-side (rangos de 1000) sobre `attendees`, `control_usage`, `ticket_categories`, `control_types`.
  - Genera el XLSX con `exceljs` (import `npm:exceljs`) manteniendo las mismas 2 hojas actuales (RESUMEN + ASISTENTES) para no romper el formato empresarial.
  - Devuelve el archivo como `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (stream binario).
- `ExportButton.tsx` se reemplaza por un botón que:
  - Llama `supabase.functions.invoke('export-attendees-report', { body: { event_id } })` con `responseType`/manejo de blob.
  - Muestra estado "Generando en servidor…" y descarga el blob con `file-saver`.
  - Ya no carga `useAttendees()` completo → dashboard queda liviano.
- Se mantiene el export local existente para Cédulas (ya optimizado).

### 2. Bindings de plantilla por categoría (uso automático)

**Estado actual:** La tabla `ticket_template_category_bindings` ya existe en DB (con `is_default`), pero no hay hook ni UI, y `ExportTicketsPNG` recibe `attendees` sin resolver plantilla por categoría.

**Solución:**
- Nuevo hook `useTemplateCategoryBindings.ts`:
  - `list(eventId)`, `setBinding(templateId, categoryId, isDefault)`, `removeBinding(id)`.
- UI en `TicketTemplateEditor.tsx`: sección "Categorías asignadas" dentro de cada plantilla con multi-select de categorías del evento + checkbox "Plantilla por defecto".
- Nuevo componente `ExportTicketsByCategory.tsx` para el flujo automático:
  - Lee todas las plantillas + bindings del evento.
  - Agrupa asistentes por `category_id` y resuelve plantilla:
    1. Binding específico de esa categoría, si existe.
    2. Plantilla marcada `is_default` global.
    3. Override manual (dropdown por categoría) si el usuario lo activa.
  - Genera un ZIP único con subcarpetas por categoría (`invitados/`, `socios/`, …) usando la lógica existente de `ExportTicketsPNG.generateTicketImage`.
- `ExportTicketsPNG` (por plantilla) se mantiene como opción "exportar solo esta plantilla".

### 3. Dashboard Análisis en tiempo real con desglose por categoría

**Diagnóstico:** `useAdvancedAnalytics` ya usa RPC `get_event_analytics_summary` y suscripción Realtime a `control_usage`, `attendees`, `cedula_control_usage`, `cedula_registros`. El desglose por categoría existe en `category_coverage` y `category_by_hour` (heatmap).

**Ajustes puntuales:**
- Confirmar/exponer en `EnhancedKPIs` una fila adicional o mini-tabla resumida con "Ingresos por categoría (últimos)" usando `enhancedMetrics.categoryEfficiency` — hoy se ve solo en la pestaña Cobertura.
- Añadir en `LiveActivityFeed` un badge de color por categoría (ya viene `category_color` desde el RPC) para diferenciar visualmente invitados vs socios en el feed en vivo.
- Añadir una pestaña / card "Por Categoría" en `TrendAnalysis` que grafique un stacked bar por hora usando `summary.category_by_hour` (ya disponible en el RPC, hoy solo se usa como heatmap).
- Verificar que el filtro "Categoría" del header de Análisis se aplica a todas las series (ya lo hace vía `p_category` en el RPC).
- Reducir `staleTime` del `summaryQuery` de 15s a 5s para percepción más "en vivo" (Realtime ya invalida, esto es fallback).

No se toca la lógica de scaneo, RLS ni tablas.

---

### Detalles técnicos

**Archivos nuevos:**
- `supabase/functions/export-attendees-report/index.ts`
- `src/hooks/useTemplateCategoryBindings.ts`
- `src/components/ExportTicketsByCategory.tsx`
- `src/components/analytics/CategoryBreakdownChart.tsx`

**Archivos modificados:**
- `src/components/ExportButton.tsx` — usa la edge function, sin cargar datasets pesados.
- `src/components/TicketTemplateEditor.tsx` — UI de bindings + botón "Exportar por categoría".
- `src/components/analytics/LiveActivityFeed.tsx` — badge de color por categoría.
- `src/components/analytics/TrendAnalysis.tsx` — nuevo gráfico stacked por categoría/hora.
- `src/components/analytics/EnhancedKPIs.tsx` — mini-desglose por categoría (opcional, compacto).
- `src/hooks/useAdvancedAnalytics.ts` — `staleTime` a 5s.

**Sin migraciones:** la tabla `ticket_template_category_bindings` ya existe; no se agregan columnas ni políticas nuevas. La edge function `export-attendees-report` usa RPC/`.range()` con service role internamente respetando el filtro por `event_id`.
