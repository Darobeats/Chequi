# Fix: "cannot add postgres_changes callbacks for realtime:schema-..."

## Causa raíz
El `ErrorBoundary` se dispara porque dos hooks de Realtime (`useCedulaRealtime` y la suscripción dentro de `useAdvancedAnalytics`) usan nombres de canal fijos basados solo en `eventId`:

- `cedula-realtime-${eventId}`
- `analytics-realtime-${eventId}`

En React 18 (StrictMode / re-renders rápidos durante el login y la carga del `EventContext`) el `useEffect` se monta, desmonta y vuelve a montar antes de que el `removeChannel` previo termine de salir del servidor. Cuando el segundo `useEffect` reusa el mismo nombre de canal, el cliente Realtime intenta registrar nuevos `.on('postgres_changes', ...)` sobre un canal que ya hizo JOIN, y el servidor responde con `cannot add 'postgres_changes' callbacks for realtime:schema-...` → React lo captura como excepción y el `ErrorBoundary` muestra "Algo salió mal".

Esto empezó a romper login porque `Admin` monta ambos hooks a la vez justo después del `SupabaseAuthProvider`.

## Cambios

### 1. `src/hooks/useCedulaRealtime` (en `src/hooks/useCedulaRegistros.ts`)
- Generar un sufijo único por montaje: `const channelName = \`cedula-realtime-${eventId}-${crypto.randomUUID()}\`` dentro del `useEffect`.
- Mantener el resto igual (subscribe + removeChannel en cleanup).

### 2. `src/hooks/useAdvancedAnalytics.ts`
- Mismo patrón: `analytics-realtime-${eventId}-${crypto.randomUUID()}`.

### 3. `src/hooks/useSupabaseData.ts` (`useAttendees`)
- También usa canal fijo `schema-db-changes` sin filtro por evento. Aplicar el mismo arreglo: nombre único por montaje (`attendees-realtime-${crypto.randomUUID()}`) para evitar colisión si el hook se vuelve a montar.

### 4. Salvaguarda defensiva
- En los tres hooks, envolver `supabase.removeChannel(channel)` en `try/catch` silencioso para que un error de limpieza nunca propague a React y dispare el `ErrorBoundary`.

## Fuera de alcance
- No tocar RLS, edge functions, ni lógica de negocio.
- No cambiar el `ErrorBoundary` ni el flujo de auth.

## Verificación
- Recargar `/admin` tras login: ya no debe aparecer el `ErrorBoundary`.
- Confirmar en consola que no se repita el mensaje `cannot add 'postgres_changes' callbacks`.
- Inserciones en `cedula_registros` siguen invalidando el dashboard en tiempo real.
