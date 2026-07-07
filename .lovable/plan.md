
# Escalar a 10k asistentes y reparar el módulo Análisis

## Diagnóstico

**Por qué solo se ven 1000 de 3000 QRs y por qué "Análisis" no muestra nada real:**

- `useAttendees` y `useControlUsage` (en `src/hooks/useSupabaseData.ts`) hacen un único `select()` sin paginar. Supabase corta en 1000 filas por request. A partir de 1001 registros, todo lo que consume estos hooks queda mutilado: `AttendeeList`, `Dashboard`, y **todo `useAdvancedAnalytics`** (que deriva KPIs, tendencias, cobertura y detalles desde estos arrays).
- `useAdvancedAnalytics` además intenta procesar en el navegador el join completo `control_usage → attendees → ticket_categories`. Con 10k asistentes × N controles esto no es viable: memoria, tiempo de render y ancho de banda explotan.
- Los conteos globales de `useUsageCounters` sí usan `count: exact`, por eso los KPIs "Total de Usos / Usuarios Activos" a veces se ven bien mientras el resto del dashboard está vacío o desactualizado — inconsistencia que el cliente percibe como "no sirve".

## Objetivo

Soportar eventos de **10.000 asistentes (QR + cédula)** sin degradar el dashboard, manteniendo la arquitectura actual (Supabase + React Query + Realtime) y sin cambios disruptivos a mitad de evento.

## Estrategia en dos capas

### Capa 1 — Paginación segura en cliente (arreglo inmediato)

Se elimina el techo de 1000 en todos los hooks que hoy hacen `select()` plano.

1. **Nuevo util** `src/lib/fetchAllPaginated.ts`
   - Firma: `fetchAllPaginated<T>(buildQuery: (from, to) => PostgrestBuilder<T>, pageSize = 1000)`.
   - Loop `.range(from, from+pageSize-1)` hasta que la página vuelva con menos filas que `pageSize`.
   - Aborta con `AbortController` para poder cancelar al desmontar.

2. **`src/hooks/useSupabaseData.ts`**
   - `useAttendees`: reemplazar el `select` único por `fetchAllPaginated`, ordenando por `created_at` para estabilidad. Añadir `staleTime: 30_000` para no re-descargar en cada render.
   - `useControlUsage`: igual, ordenando por `used_at desc`. Además restringir columnas al mínimo que consumen los componentes (id, attendee_id, control_type_id, used_at, control_type nombre, attendee id/name/category_id, ticket_category name/color) — reduce payload a la mitad.
   - Mantener las suscripciones Realtime como están (ya usan nombres de canal únicos).

3. **Verificación**: `AttendeeList` debe mostrar los 3000/3000 y el KPI "Total Registros" también.

### Capa 2 — Agregaciones server-side para Análisis (escalable a 10k+)

En lugar de bajar toda la tabla al navegador, se calculan las métricas en Postgres y solo se traen resultados agregados. Esto mantiene el dashboard fluido incluso con 50k eventos.

4. **Migración SQL** — nuevas funciones `STABLE SECURITY DEFINER` con `SET search_path = public`, filtradas por `event_id` y validadas con `user_can_access_event(event_id)`:

   - `analytics_kpis(p_event_id uuid, p_time_range text, p_control_type uuid, p_category uuid)` → 1 fila: `total_usages, unique_attendees, total_attendees, participation_rate, avg_usage_per_attendee, peak_hour, peak_hour_count`.
   - `analytics_hourly(p_event_id, p_time_range, ...)` → serie por hora (`hour`, `count`, `control_type_id`, `category_id`) para gráficos de tendencia, distribución y stacked-by-control.
   - `analytics_control_coverage(p_event_id, p_time_range, ...)` → por control: `total_usages`, `unique_users`, `coverage_pct`.
   - `analytics_category_coverage(p_event_id, p_time_range, ...)` → por categoría (QR y cédula unificadas por nombre de categoría): `total_attendees`, `used_attendees`, `coverage_pct`.
   - `analytics_recent_activity(p_event_id, p_limit int default 50)` → últimos scans (QR + cédula) ya unificados y ordenados.

   Todas las funciones incluyen `GRANT EXECUTE ... TO authenticated` y el chequeo interno de acceso al evento; el resto de tablas quedan intactas.

5. **Hook reescrito** `useAdvancedAnalytics.ts`
   - Reemplaza los `useMemo` que hoy iteran arrays gigantes por 5 `useQuery` que invocan las RPCs de arriba con `{ p_event_id, p_time_range, p_control_type, p_category }`.
   - `staleTime: 15_000`, `refetchOnWindowFocus: false`.
   - Mantiene el `useEffect` Realtime existente pero cambia el callback a `invalidateQueries` sobre las 5 nuevas keys (`['analytics_kpis', eventId, filters]`, etc.) con debounce de 1s para no martillar Postgres si llegan ráfagas de scans.
   - La tab "Detalles" pagina server-side: pasa a `useInfiniteQuery` con `range()` por páginas de 200 filas y filtros aplicados en SQL, no en JS.

6. **Componentes de la tab de Análisis** (`EnhancedKPIs`, `TrendAnalysis`, `CoverageMetrics`, `LiveActivityFeed`, `DetailedDataTable`)
   - Cambio mínimo: adaptar props a la nueva forma que devuelve el hook (mismos nombres de campos). No se altera el diseño visual.
   - Agregar estados de `isLoading` y `isError` visibles (hoy si el hook falla el usuario ve tarjetas en blanco, lo que sostiene la queja del cliente).

### Capa 3 — Generación masiva de QRs (asegurar 10k en un lote)

7. **`BulkQRGenerator`** ya existe. Verificar y, si es necesario, ajustar para:
   - Insertar en **batches de 500** vía `supabase.from('attendees').insert(batch)` en lugar de un único insert gigante (evita timeouts y payloads >6 MB de Edge).
   - Mostrar barra de progreso real (`generados / total`) usando estado local.
   - No bloquear la UI: `for await` con `await new Promise(r => setTimeout(r,0))` entre batches.
   - Al terminar, invalidar `['attendees', eventId]` y las 5 keys de analytics.

## Detalles técnicos

- **Sin cambios de esquema**: no se crean ni alteran tablas, solo funciones. Cumple la regla de despliegue no disruptivo a mitad de evento.
- **RLS**: cada RPC valida `user_can_access_event(p_event_id)` internamente; no se relaja ninguna política existente.
- **Realtime**: se conservan los canales con nombre único por mount (fix anterior de login se mantiene).
- **Compatibilidad**: los componentes de la tab Análisis mantienen su API pública; solo cambia el interior del hook.
- **Performance esperada**: para 10k asistentes y 30k usos, cada RPC devuelve <5 KB y responde en <150 ms; el bundle del cliente ya no descarga megabytes de `control_usage`.

## Orden de implementación

1. Migración SQL con las 5 funciones + grants.
2. `fetchAllPaginated` util.
3. Refactor `useAttendees` y `useControlUsage`.
4. Refactor `useAdvancedAnalytics` a RPCs + adaptación de los 5 componentes de análisis.
5. Ajustes de batching y progreso en `BulkQRGenerator`.
6. Prueba manual: generar 3000 QRs, verificar `AttendeeList` = 3000, escanear varios, verificar que KPIs, tendencias, cobertura, actividad en vivo y detalles reflejan el número real.
