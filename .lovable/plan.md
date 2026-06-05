# Asignación de mesa por cédula

Objetivo del evento de hoy: al escanear la cédula, mostrar de forma muy visible el **número de mesa** asignado al asistente. Si no está en la base, avisar. Si ya fue registrado antes (duplicado), avisar la duplicidad pero **igualmente mostrar la mesa** para que pueda dirigirse.

## Cambios

### 1. Base de datos
- Agregar columna `mesa` (text, nullable) a `cedulas_autorizadas`. Se usa text para soportar valores como "12", "A5", "VIP-3".
- Sin cambios destructivos. Compatible con eventos existentes.

### 2. Importación masiva (CedulasBulkImport)
- Detectar columna `mesa` / `table` / `mesa_asignada` en el Excel.
- Incluir `mesa` en las filas parseadas y en el bulk insert.
- Mostrar columna "Mesa" en el preview.

### 3. Gestión manual (CedulasAutorizadasManager)
- Añadir campo "Mesa" en el diálogo de alta manual.
- Mostrar columna "Mesa" en la tabla de autorizadas.

### 4. Resultado de escaneo (CedulaScanResult) — lo más importante
- Cuando `autorizadaData.mesa` exista, mostrar un bloque **destacado, grande, alto contraste** arriba del resto: ícono de mesa + "MESA {numero}".
- Mostrar siempre que haya mesa, incluyendo:
  - Autorizado normal → bloque verde con mesa.
  - **Duplicado** (ya registrado previamente) → alerta ámbar "Ya registrado" + bloque con la mesa para que el asistente sepa adónde ir.
  - No autorizado / sin mesa → mensaje actual sin bloque de mesa.

### 5. Detección de duplicado en el flujo de escaneo
- En `useCedulaScanner` / `Scanner.tsx` (flujo cédula), cuando la cédula ya tenga un registro previo en `cedula_registros`, marcar `isDuplicate=true` y pasar `autorizadaData` con la mesa al `CedulaScanResult`. No bloquear: solo informar y mostrar mesa.

### 6. Tipos e i18n
- Añadir `mesa?: string | null` en `CedulaAutorizada` e `InsertCedulaAutorizada`.
- Añadir claves i18n ES/EN: `cedulaScanResult.table`, `cedulaScanResult.tableAssigned`, `cedulaScanResult.alreadyRegistered`, `cedulaScanResult.alreadyRegisteredGoToTable`.

## Detalles técnicos
- Migración: `ALTER TABLE public.cedulas_autorizadas ADD COLUMN mesa text;` (RLS y grants existentes ya cubren la columna).
- `types.ts` de Supabase se regenera tras la migración; los hooks existentes seguirán funcionando porque solo agregamos un campo opcional.
- El bloque de mesa en `CedulaScanResult` usará tokens semánticos (`bg-primary/10`, `text-primary`, `border-primary`) — sin colores hardcoded.

## Fuera de alcance
- Reasignación de mesa desde el escáner.
- Reporte por mesa (puede agregarse después si lo piden).
- Cambios en flujo QR (este evento es solo cédula).
