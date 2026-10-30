# Rebranding con logo y favicon en alta resolución

## Qué cambia
1. **Logo nuevo (transparente, alta resolución)** en todos los lugares donde hoy aparece el logo de Chequi: encabezado de la app y pie de página de la landing. También en la página de acceso y en la barra "Powered by" si allí se muestra la marca Chequi como texto/logo.
2. **Favicon nuevo** (la "U" con cara) en la pestaña del navegador, en el ícono al agregar a pantalla de inicio (iPhone/Android) y en la app instalada.
3. La "U" se guarda como pieza separada para darle más protagonismo en el futuro (sin usarla grande por ahora).

## Detalles técnicos
- Subir `CHEQUI_logoRB.png` como asset CDN y reemplazar el puntero `chequi-logo.png.asset.json` usado en `Header.tsx` y `LandingFooter.tsx`; revisar `Auth.tsx` y `SponsorLogosBar.tsx` para usar el mismo logo.
- Subir `CHEQUI_faviconRB.png` como asset (`chequi-mark`) para uso futuro.
- Generar desde el favicon, con padding cuadrado y fondo transparente: `public/favicon.png` (64), `apple-touch-icon.png` (180, fondo oscuro de marca para iOS), `icon-192.png`, `icon-512.png`. Mantener referencias en `index.html` y `manifest.webmanifest`; quitar `favicon.ico` de `includeAssets` en `vite.config.ts`.
- Verificar con captura en navegador que el logo se vea nítido en celular y escritorio.
