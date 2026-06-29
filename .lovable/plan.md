
# Plan: Generador masivo de QRs + Modo Kiosko (auto-escaneo)

---

## Parte 1 — Generador masivo de QRs (sin cambios)

**Objetivo:** Generar N QRs pre-creados, exportar Excel + ZIP de PNGs para que el cliente reparta.

- DB: usar `attendees` existente con `name = 'Pre-asignado #N'` y categoría seleccionada en el form.
- Nuevo componente `BulkQRGenerator.tsx` en Admin:
  - Cantidad (default 3000), categoría destino, prefijo opcional.
  - Inserta en BD vía edge function `bulk-generate-qrs` (batch 500, valida admin del evento).
  - Genera PNGs con `qrcode` lib en Web Worker (sin congelar UI), empaqueta con `jszip`, descarga.
  - Excel con `exceljs`: `# | qr_code | categoría`.
- Progress bar visual.

**Archivos:** `supabase/functions/bulk-generate-qrs/index.ts`, `src/components/admin/BulkQRGenerator.tsx`, `src/workers/qrGenerator.worker.ts`, edit `src/pages/Admin.tsx`.

---

## Parte 2 — Modo Kiosko (auto-escaneo desatendido) ✨ REVISADO

**Objetivo:** Una vez configurado evento + control type, el operador presiona **un solo botón "Activar modo kiosko"** y el dispositivo queda escaneando solo. Conforme pasan los asistentes, lee QR tras QR sin intervención humana. Cada escaneo muestra resultado por unos segundos, se auto-cierra, y vuelve a escanear automáticamente.

### 2.1 Flujo actual vs nuevo

**Hoy:**
1. Operador selecciona evento + control
2. Presiona "Activar Cámara"
3. Escanea QR → muestra resultado
4. Después de 3.5s el resultado se cierra
5. **El operador debe presionar "Activar Cámara" otra vez** ⛔

**Modo kiosko:**
1. Operador selecciona evento + control + activa kiosko
2. Cámara queda **permanentemente activa**
3. Cada QR detectado:
   - Pausa el escáner 2-3s (anti-duplicado)
   - Muestra overlay translúcido grande sobre la cámara: ✓/✗ + categoría + usos
   - Suena beep diferenciado (verde/rojo, ya existe `scanFeedback.ts`)
   - Vibración (ya soportado)
   - Auto-cierra y reanuda escaneo, **sin tocar el dispositivo**
4. Si QR no es "de los nuestros" → flash rojo + beep error, sin congelarse.

### 2.2 Cambios en `src/components/QRScanner.tsx`

- Nuevo toggle persistente `kioskMode` (guardado en `localStorage` por evento+control).
- Cuando `kioskMode=true`:
  - `startScanning()` se invoca **automáticamente** al montar y tras cada resultado.
  - El `useEffect` que auto-cierra `lastResult` también llama `setScanning(true)` de nuevo (no solo limpia).
  - Tiempos reducidos: éxito 2s, error 2.5s (configurable).
  - Bloquear navegación accidental: prevenir scroll, ocultar header en modo kiosko (fullscreen API opcional).
- Botón grande "🔒 Activar modo kiosko" / "Desactivar" (requiere mantener presionado 2s para salir, evita toques accidentales del público).

### 2.3 Cambios en `ScannerVideo.tsx`

- Cuando `kioskMode=true`: ocultar botón "Detener escaneo", mostrar contador "Escaneados: 124" en esquina, indicador visual permanente de "escaneando".

### 2.4 Cambios en `ScanResult.tsx`

- Cuando `kioskMode=true`: render como **overlay flotante sobre el video** (no reemplaza la cámara), tamaño grande, auto-desaparece. La cámara nunca se apaga visualmente.
- Eliminar botón cerrar (innecesario, es automático).

### 2.5 Wake Lock + prevención de sleep

- Usar `navigator.wakeLock.request('screen')` cuando kiosko activo → el dispositivo no se apaga.
- Fullscreen API opcional: pedir fullscreen al activar kiosko.
- Liberar wake lock al desactivar.

### 2.6 Modo kiosko para Cédula (mismo patrón)

- En `src/pages/Scanner.tsx` (módulo cédula) + `CedulaScanner.tsx`:
  - Mismo toggle kiosko.
  - Tras capturar foto + analizar IA → muestra resultado overlay, auto-reanuda captura.
  - Nota: el flujo cédula requiere capturar foto manualmente (no es continuo como QR). En kiosko cédula → tras mostrar resultado, vuelve directamente a `startCamera()` listo para nueva captura, sin tocar pantalla.

### 2.7 Indicadores visuales kiosko

- Badge fijo arriba: "🟢 MODO KIOSKO ACTIVO — Evento X · Control Y · Escaneados: N"
- Si se pierde conexión: indicador discreto pero scanner sigue funcionando (offline queue ya implementado).
- Contador de escaneos en sesión (memoria local).

---

## Archivos

**Nuevos:**
- `supabase/functions/bulk-generate-qrs/index.ts`
- `src/components/admin/BulkQRGenerator.tsx`
- `src/workers/qrGenerator.worker.ts`
- `src/hooks/useKioskMode.ts` (toggle + wake lock + persistencia localStorage)
- `src/hooks/useWakeLock.ts`

**Editados:**
- `src/pages/Admin.tsx` (montar BulkQRGenerator)
- `src/components/QRScanner.tsx` (lógica auto-restart, kiosk toggle)
- `src/components/scanner/ScannerVideo.tsx` (UI kiosko)
- `src/components/scanner/ScanResult.tsx` (overlay flotante en kiosko)
- `src/pages/Scanner.tsx` (kiosko para cédula)
- `src/components/cedula/CedulaScanner.tsx` (auto-reanudar captura)
- `src/i18n/locales/{es,en}/common.json`

**Sin cambios de schema** para Parte 2 — todo es UI/lógica de cliente.

---

## Confirmación pre-implementación

1. **Salir de kiosko**: ¿prefieres mantener presionado un botón 2s, o un código PIN corto (ej. 4 dígitos) para evitar que un asistente desactive el kiosko por accidente?
2. **Generador QR — lote único o reutilizable**: ¿es solo para este evento (componente "one-shot") o lo dejamos como herramienta permanente disponible para futuros eventos?
