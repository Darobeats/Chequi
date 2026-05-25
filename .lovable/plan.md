## Soporte Offline — Fases 1 a 5

Implementación priorizada para que la app funcione sin internet durante el evento y los datos lleguen completos al reporte de cobro.

### ⚠️ Aviso importante sobre PWA (Fase 1)

PWA y Service Worker **solo funcionan en la versión publicada** (`chequi.online`), no en el preview del editor Lovable. Esto es una limitación técnica del entorno de preview (iframes bloquean Service Workers). El equipo en campo debe usar la URL publicada e instalar la app en el celular antes del evento.

---

### Fase 1 — App Shell Offline (PWA)

**Objetivo:** que la app abra sin internet, incluso tras cerrar el navegador.

1. Instalar `vite-plugin-pwa` y `workbox-window`.
2. Configurar `vite.config.ts`:
   - `registerType: 'autoUpdate'`
   - `devOptions: { enabled: false }` (no activar en dev/preview)
   - `navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/, /supabase/]`
   - Estrategia `NetworkFirst` para HTML, `CacheFirst` para assets estáticos.
3. Guard de registro en `src/main.tsx`: NO registrar SW si está en iframe ni en host de preview de Lovable.
4. Crear `public/manifest.webmanifest` con: nombre "Chequi", íconos 192/512, theme color `#0A0A0A`, `display: standalone`.
5. Crear íconos PWA en `public/` (192x192, 512x512, apple-touch-icon).
6. Actualizar `index.html` con `<link rel="manifest">` y `apple-touch-icon`.
7. Crear página `/install` con instrucciones para Android (botón de instalación) e iOS (Compartir → Agregar a inicio).
8. Botón de acceso a `/install` desde el header del Scanner.

### Fase 2 — Pre-carga de datos del evento (IndexedDB)

**Objetivo:** descargar todo lo necesario antes de salir de zona con cobertura.

1. Instalar `idb` (wrapper liviano de IndexedDB).
2. Crear `src/lib/offlineDB.ts` con stores: `whitelist`, `attendees`, `controlTypes`, `categoryControls`, `eventConfig`, `pendingCedulaScans`, `pendingQRScans`, `localCedulaUsage` (para detectar duplicados offline).
3. Crear hook `src/hooks/useOfflinePrecharge.ts`:
   - Descarga paginada (respetando límite de 1000) de `cedulas_autorizadas`, `attendees`, `control_types`, `category_controls`, `event_configs` del evento seleccionado.
   - Guarda en IndexedDB con timestamp.
   - Retorna progreso (X de Y registros).
4. Crear componente `src/components/OfflinePrecharge.tsx`:
   - Botón "📥 Preparar evento para modo offline"
   - Barra de progreso por tabla
   - Indicador "✅ Evento listo offline · 1.234 cédulas · 567 tickets · actualizado hace 3 min"
   - Botón "🔄 Refrescar cache"
5. Integrar en el header de `/scanner` y `/cedula-registro`.

### Fase 3 — Cola offline para módulo Cédula

**Objetivo:** que escanear cédulas y registrar accesos NO requiera internet.

1. Crear `src/hooks/useOfflineCedulaScans.ts` (espejo de `useOfflineScans`):
   - `addPendingCedulaScan({ registro, controlUsage, accessLog })` → guarda en IndexedDB con firma HMAC.
   - Auto-sync al volver `navigator.onLine`.
   - Maneja respuestas del edge function: `synced` / `duplicate_skipped` / `rejected`.
2. Crear `src/hooks/useOfflineAuthorization.ts`:
   - Si `navigator.onLine` → consulta Supabase normal.
   - Si offline → consulta IndexedDB (`whitelist` store).
3. Crear `src/hooks/useOfflineControlLimit.ts`:
   - Si offline → cuenta usos en `localCedulaUsage` de IndexedDB.
4. Modificar `src/pages/Scanner.tsx`:
   - Detectar `navigator.onLine` en cada handler.
   - Offline: encolar y actualizar `localCedulaUsage` localmente para detectar duplicados intra-dispositivo.
   - Mostrar `<OfflineSyncStatus>` (componente existente) también en tab Cédula.
   - Feedback visual: vibración + sonido distinto offline ("guardado localmente · se sincronizará").
5. Misma lógica para `handleManualSubmit` (entrada manual offline).

### Fase 4 — Edge function `process-cedula-scan`

**Objetivo:** sincronizar la cola de cédulas al volver internet, con validación de firma e idempotencia.

1. Crear `supabase/functions/process-cedula-scan/index.ts`:
   - Valida JWT del usuario.
   - Valida firma HMAC-SHA256 (igual que `process-qr-scan`).
   - Verifica `user_can_access_event(event_id)`.
   - Inserta `cedula_registros`, `cedula_control_usage`, `cedula_access_logs` en transacción.
   - Maneja duplicados (constraint UNIQUE) → retorna `duplicate_skipped` sin error.
   - Acepta payload en lote (`scans: []`) para reducir round-trips al sincronizar muchos a la vez.
2. Registrar en `supabase/config.toml` (`verify_jwt = true`).
3. Test básico con `supabase--test_edge_functions`.
4. El hook `useOfflineCedulaScans` invoca esta función en bloques de 50.

### Fase 5 — Resiliencia de sesión

**Objetivo:** que el operador no pierda la sesión durante un evento de varias horas sin internet.

1. Configurar Supabase Auth para que el refresh token dure mínimo 7 días (acción manual en Dashboard — se indicará al usuario con `presentation-link`).
2. Modificar `SupabaseAuthContext`:
   - Si `getSession()` falla offline pero hay token cacheado en `localStorage`, considerarlo válido localmente hasta que expire el JWT.
   - Bloquear `signOut()` accidental cuando hay escaneos pendientes (alerta de confirmación).
3. Banner persistente en `/scanner`:
   - 🟢 Online · sesión activa
   - 🟡 Online · sincronizando (X pendientes)
   - 🔴 Offline · sesión local válida hasta `[fecha]`
4. Si JWT expira offline: permitir seguir escaneando con cola local; al volver online forzar re-login para sincronizar.

---

### Resumen de archivos

**Nuevos:**
- `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
- `src/lib/offlineDB.ts`
- `src/hooks/useOfflinePrecharge.ts`
- `src/hooks/useOfflineCedulaScans.ts`
- `src/hooks/useOfflineAuthorization.ts`
- `src/hooks/useOfflineControlLimit.ts`
- `src/components/OfflinePrecharge.tsx`
- `src/components/OfflineSessionBanner.tsx`
- `src/pages/Install.tsx`
- `supabase/functions/process-cedula-scan/index.ts`

**Modificados:**
- `vite.config.ts` (VitePWA)
- `src/main.tsx` (guard SW + registro)
- `index.html` (manifest link, icons)
- `src/pages/Scanner.tsx` (encolar offline)
- `src/context/SupabaseAuthContext.tsx` (sesión offline)
- `src/App.tsx` (ruta `/install`)
- `supabase/config.toml` (nueva función)

**Dependencias:** `vite-plugin-pwa`, `workbox-window`, `idb`

---

### Acción manual requerida del usuario (post-implementación)

1. Extender la duración del refresh token en Supabase Dashboard (Auth Settings).
2. Antes de un evento sin internet: abrir la app publicada `chequi.online` en los celulares de campo, instalar a inicio, hacer login y pulsar "Preparar evento para modo offline".

### Lo que queda para Fases 6–8 (siguiente prompt)

- Panel detallado de cola pendiente con vista por escaneo
- Export Excel desde IndexedDB sin sincronizar (respaldo)
- Tutorial in-app para operadores
- Sonidos/vibración diferenciados
- Vista de conflictos post-sync