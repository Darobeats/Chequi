## Diagnóstico

Revisé el Excel `BASE DE ASISTENTES ANIVERSARIO V1.xlsx`:
- 377 filas, 3 columnas: `CEDULA`, `NOMBRE`, `MESA`
- Las cédulas son números (algunas de 10 dígitos como `9632421545`)
- Mesa son enteros (1, 2, 3, ...)

El código actual (`useBulkCreateCedulasAutorizadas` en `src/hooks/useCedulasAutorizadas.ts`) **silencia el error real** mostrando solo el toast genérico "Error en la importación masiva". Por eso no se ve la causa.

Causas más probables (en orden):
1. **Sesión/permisos**: el upsert requiere RLS `admin` o `control` + `user_can_access_event(event_id)`. Si el `eventId` que se pasa no es uno asignado al usuario o el rol no es correcto, falla con error de RLS sin mostrar detalle.
2. **Payload de 377 filas en un solo upsert**: aunque Supabase lo soporta, conviene partir en lotes (chunks) para evitar timeouts y permitir tolerancia parcial.
3. **Valores `undefined`** en `categoria`/`empresa` (no existen en este Excel) podrían enviar claves explícitas que confunden al upsert; mejor omitirlas.

## Plan

### 1) `src/hooks/useCedulasAutorizadas.ts` — bulk insert robusto y con error real
- `useBulkCreateCedulasAutorizadas`:
  - Insertar en **lotes de 100** dentro de un loop.
  - **Eliminar campos `undefined`** de cada registro antes de enviar.
  - Capturar `error.message`, `error.details`, `error.hint`, `error.code` y propagarlos.
  - En `onError`: mostrar `toast.error('Error: ' + (error.message || 'desconocido'))` y `console.error('[bulkCreateCedulas] error:', error)` para que el operador y nosotros veamos la causa real.
  - Retornar conteo total insertado sumando todos los lotes.

### 2) `src/components/cedula/CedulasBulkImport.tsx` — saneo previo y feedback
- Antes de enviar, **eliminar campos vacíos** (`''`) y `undefined` para que no se envíen como columnas nulas innecesarias.
- Convertir `mesa` y `numero_cedula` siempre a `string` (ya se hace).
- Mostrar progreso "Importando lote X de Y…" mientras corre.
- Si un lote falla, mostrar el número de lote y el mensaje de error específico.

### 3) Validación de evento seleccionado
- Verificar al inicio de `handleImport` que `eventId` no esté vacío; si lo está, mostrar mensaje claro "Selecciona un evento primero".

### Resultado
- El usuario podrá importar las 377 filas.
- Si vuelve a fallar, **veremos el error real** (RLS, columna, tipo, etc.) tanto en el toast como en consola, y lo arreglaremos en una siguiente iteración inmediata.

### Fuera de alcance
- No se cambia el esquema de BD.
- No se modifican políticas RLS (ya están correctas según la última auditoría).
