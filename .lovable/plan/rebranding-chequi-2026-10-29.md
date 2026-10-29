# Rebranding Chequi

Fuente: el tablero de identidad que subiste (logo CHEQUI con la "U" de QR, dos íconos, colores negro #0A0A0A / dorado #E0B52F / blanco #F5F5F5, tipografía Sora).

## Fase 1 — Inmediata: ícono de pestaña y app
- Recortar del tablero el ícono dorado (fondo dorado, U negra) como ícono principal; el oscuro queda de reserva.
- Reemplazar el ícono de pestaña del navegador, el ícono al instalar en celular (iPhone y Android) y el de la app instalable.
- Retirar el ícono antiguo para que los navegadores no lo sigan mostrando.

## Fase 2 — Logo en la app
- Recortar el logo CHEQUI (letras doradas) en versión sin fondo.
- Ponerlo donde hoy aparece el nombre o marca de Chequi: página de inicio (barra superior y pie), pantalla de acceso, encabezado del panel, pantalla de instalación y páginas legales.
- No tocar los logos propios de cada evento ni los patrocinadores/aliados.

## Fase 3 — Colores y tipografía
- Ajustar el dorado principal exactamente a #E0B52F, el negro a #0A0A0A y el blanco a #F5F5F5 (el tema actual ya es dorado/negro, el cambio es fino).
- Cambiar la letra de toda la app a Sora (títulos en Bold/Semibold, texto en Regular).
- Actualizar el color de la barra del navegador en celular.

## Fase 4 — Verificación
- Revisar en pantalla de computador y de celular: inicio, acceso, pestaña del navegador.
- Guardar la identidad (colores, letra, logo) como regla del proyecto para futuros cambios.

## Nota
El logo se recorta de la imagen subida (formato PNG). Si tienes los archivos originales (PNG grande sin fondo o SVG), la calidad será mejor; si no, trabajo con este.

## Detalles técnicos
- Recorte con ImageMagick desde el tablero; favicon 64x64 en `public/favicon.png`, `apple-touch-icon.png` 180, `icon-192/512.png`, borrar `favicon.ico`, actualizar `index.html` y `manifest.webmanifest` (`theme_color` #0A0A0A).
- Logo como asset CDN (`src/assets/chequi-logo.png.asset.json`) usado en LandingHeader/Footer, Auth, Header, Install, LegalPageLayout.
- Tokens en `src/index.css` (HSL del dorado #E0B52F ≈ 45 74% 53%), fuente Sora vía Google Fonts y `tailwind.config.ts` fontFamily.
