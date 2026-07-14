
## Objetivo

1. Eliminar el tope de 1000 en el Centro de Exportación (lista y descarga).
2. Alinear al 100% lo que se ve en el editor visual con el PNG exportado (misma posición, tipografía y tamaño).
3. Auditoría profunda del proyecto pensando en un evento de ~9.500 asistentes durante 2 días (rendimiento, seguridad, código muerto, offline, escaneo, exportación masiva).

---

## 1. Quitar límite de 1000 en exportación

**Archivos:** `src/components/TicketExportCenter.tsx`, `src/components/BulkTicketAssignment.tsx`.

- Reemplazar `filtered.slice(0, 1000)` por render virtualizado (ventana de ~200 filas visibles con `react-window` o virtualización manual por scroll) para no colapsar el DOM con 9.500 filas.
- Eliminar los mensajes "Mostrando 1000 de X".
- Confirmar que `runBulkExport` ya itera sobre `filtered` completo (sí lo hace); ajustar `progress` para reportar cada 25 tickets en lugar de cada uno (menos re-renders con lotes grandes).
- En `useAttendeesPage` verificar que `fetchAllPaginated` cubre >1000 asistentes al alimentar el Centro de Exportación (ya existe; auditar el llamador).

**Riesgo:** generar 9.500 PNG en el navegador puede tumbar la pestaña por memoria del ZIP. Mitigación:
- Procesar en lotes de 500 tickets → generar un ZIP por lote (`tickets_lote_01.zip`, `..._02.zip`), o
- Usar `jszip` con `streamFiles: true` y liberar blobs intermedios (`URL.revokeObjectURL`), sin acumular canvas.
- Añadir opción "Tamaño de lote" (default 1000) y descargar múltiples ZIP secuencialmente.

## 2. Sincronía Editor ↔ Exportación

**Causa raíz identificada** en `src/lib/renderTicket.ts` vs `src/components/VisualTicketEditor.tsx`:

- **Texto:** Fabric.js posiciona `Text` por su bounding box con métricas que incluyen ascender/descender; en `renderTicket` se dibuja con `ctx.textBaseline='top'` sobre `el.y`, lo que produce un desfase vertical de varios píxeles según la fuente. Fabric además usa `lineHeight` propio (~1.16) y padding interno.
- **Alineación:** Fabric aplica `textAlign` moviendo el texto dentro de su bounding; el export ignora `textAlign` (siempre `left`). Coincide para "left", pero rompe si el usuario elige center/right.
- **Fuentes:** el editor puede usar fuentes cargadas vía CSS que no estén disponibles en el contexto de `renderTicket` si el `document.fonts` aún no las resolvió → fallback a Arial y cambio de métricas.

**Cambios:**
- En `renderTicket.ts`: 
  - Calcular offset vertical equivalente al de Fabric (`fontSize * 0.07` aprox, o mejor: medir `TextMetrics.actualBoundingBoxAscent`).
  - Respetar `el.textAlign` calculando ancho con `ctx.measureText` y desplazando `x`.
  - Antes de exportar, esperar `await document.fonts.ready` para garantizar que la fuente está cargada.
- En `VisualTicketEditor`: al crear/editar `Text`, fijar `lineHeight: 1`, `charSpacing: 0` y guardar `textAlign` en el elemento (ya se guarda). Documentar en `elementsRef` que la caja se toma como `left/top` del texto.
- Añadir un modo "Vista final" dentro del editor que renderice con `renderTicket` sobre el mismo canvas (misma función que exporta), para verificación visual dentro del mismo componente. Así hay una sola fuente de verdad.
- Agregar test manual: script Playwright que renderice 3 plantillas y compare pixel-hashes del canvas Fabric vs el PNG generado (diferencia <2%).

## 3. Auditoría integral para 9.500 asistentes / 2 días

### 3.1 Base de datos y RLS
- Ejecutar `supabase--linter` y resolver todos los warnings de RLS/policies.
- Revisar índices en tablas críticas:
  - `attendees(event_id, qr_code)`, `attendees(event_id, ticket_id)` → escaneo por QR.
  - `control_usage(attendee_id, control_type_id, used_at)` → validación de límites.
  - `cedula_control_usage(event_id, numero_cedula, control_type_id)`.
  - `cedulas_autorizadas(event_id, numero_cedula)` UNIQUE.
  - `cedula_access_logs(event_id, used_at DESC)` para exportes.
  - Crear los que falten vía migración.
- Verificar que `get_event_analytics_summary` y `get_event_recent_activity` no hacen full scan (EXPLAIN ANALYZE con datos sintéticos).
- Revisar constraint UNIQUE en `cedula_control_usage(event_id, numero_cedula, control_type_id)` para prevenir doble uso en carrera.
- Revisar todas las funciones PL/pgSQL para `SET search_path TO 'public'` (ya en memoria, verificar cumplimiento).

### 3.2 Front-end: escaneo y offline
- `useOfflinePrecharge`: probar con 9.500 filas — actual `PAGE_SIZE=1000` funciona pero `putAttendees` en una sola transacción puede ser lento en móvil. Trocear a lotes de 2.000 y mostrar progreso real.
- IndexedDB: confirmar que hay índices por `event_id`, `numero_cedula`, `qr_code` en `offlineDB`.
- `useOfflineScans` / `useOfflineCedulaScans`: verificar que la cola no bloquea UI y que reintentos exponenciales tienen tope.
- Realtime: confirmar sufijos UUID en canales (memoria); auditar que ninguna suscripción se cree fuera de `useEffect`.
- Scanner: latencia de `validate_control_access_public` con 9.500 asistentes — medir con dataset sintético.

### 3.3 Seguridad
- Correr `security--run_security_scan` y `security--get_scan_results`; resolver críticos.
- Verificar que `service_role_key` no está en frontend.
- Edge functions: validación Zod en `process-cedula-scan`, `process-qr-scan`, `scan-cedula-ai`.
- Rate limiting básico en `scan-cedula-ai` (Gemini) para evitar drenar el gateway.
- Revisar policies `DELETE` en `attendees`, `control_usage`, `cedula_control_usage`, `cedula_access_logs` (solo admin del evento).

### 3.4 Exportaciones masivas
- `export-attendees-report`: ejecutar con 9.500 filas; medir tiempo y memoria. Si supera 60s, mover a streaming chunked.
- `CedulaExportButton` y `ExportButton`: reemplazar reads paginados manuales por `fetchAllPaginated` donde falte.
- ExcelJS: usar `stream.xlsx.WorkbookWriter` para hojas de >5.000 filas.

### 3.5 Analytics
- `get_event_analytics_summary` ya es server-side (memoria). Verificar cache React Query con `staleTime` razonable (30–60s) para no martillar la DB con 100 controladores conectados.
- `LiveActivityFeed`: usar Realtime con throttle en lugar de polling cada X segundos.

### 3.6 Código muerto / limpieza
- Buscar componentes no referenciados (`rg` de imports); candidatos ya detectados: `TemplateCompareDialog`, `TemplateDevicePreview` (ya eliminados). Revisar `AttendeeManagement` vs `AttendeesManager` (duplicado sospechoso), `mockData.ts`.
- Consolidar `useAttendeeManagement` y `useAttendeesPage` si comparten lógica.
- Eliminar imports no usados detectados por ESLint (`--max-warnings 0`).
- Unificar helpers de fetch paginado (`useOfflinePrecharge.fetchAllPaginated` vs `src/lib/fetchAllPaginated.ts`).

### 3.7 Resiliencia
- Verificar `ErrorBoundary` cubre todas las rutas protegidas.
- Añadir monitoreo básico: contador de errores por sesión en `localStorage` con export desde /profile.
- Confirmar Wake Lock en Kiosk se re-adquiere tras pérdida de foco.

### 3.8 Entregables de la auditoría
- Reporte en `.lovable/audit-9500.md` con hallazgos por severidad (crítico/alto/medio/bajo), archivo:línea y fix propuesto.
- Migración SQL con índices faltantes y grants revisados.
- Script Playwright (`/tmp/browser/audit/`) que simula:
  1. Login controlador
  2. Escaneo de 50 QR consecutivos en modo online
  3. Escaneo de 50 en modo offline con precarga previa
  4. Exportación de 500 tickets desde el Centro
  5. Verifica métricas de tiempo y consola sin errores.
- Lista de código muerto eliminado (archivos borrados).

---

## Detalles técnicos

- Virtualización de lista: implementación manual con `useState` + `onScroll` calculando `startIndex/endIndex` para evitar añadir dependencia si el bundle ya está grande.
- Batching de ZIP: `for (let i=0; i<items.length; i+=batchSize)` generando un ZIP por lote y disparando `saveAs` con delay 500ms entre cada uno.
- Font readiness: `if (document?.fonts?.ready) await document.fonts.ready;` al inicio de `renderTicket`.
- Text metrics fix: en `renderTicket` cambiar a `textBaseline='alphabetic'` y sumar `metrics.actualBoundingBoxAscent` a `el.y` para igualar Fabric.
- Índices SQL a crear (ejemplos):
  ```
  CREATE INDEX IF NOT EXISTS idx_attendees_event_qr ON public.attendees(event_id, qr_code);
  CREATE INDEX IF NOT EXISTS idx_attendees_event_ticket ON public.attendees(event_id, ticket_id);
  CREATE INDEX IF NOT EXISTS idx_control_usage_attendee_type_time ON public.control_usage(attendee_id, control_type_id, used_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ccu_event_ced_type ON public.cedula_control_usage(event_id, numero_cedula, control_type_id);
  ```

## Fuera de alcance

- Rediseño visual del editor (ya fue ajustado en iteraciones previas).
- Cambio de proveedor de IA/Vision.
- Migración a otro framework/backend.
