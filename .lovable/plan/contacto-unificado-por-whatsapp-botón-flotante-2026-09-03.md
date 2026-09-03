# Contacto unificado por WhatsApp + botón flotante

## Objetivo
Eliminar el correo electrónico como canal de contacto público y dejar un único número oficial: **+57 320 496 3384**, con un botón flotante de WhatsApp presente en la landing.

## 1. Quitar el email de contacto
- **FAQ**: el bloque final tiene un enlace `mailto:contacto@chequi.com`. Se reemplaza por un botón/enlace de WhatsApp al número oficial.
- **Footer**: se elimina la fila con `contacto@chequi.com` y queda solo el contacto de WhatsApp.
- **Textos (ES/EN)**: se ajustan las frases que ofrecen "soporte por email" para que hablen de soporte por WhatsApp. Se mantienen las menciones a email que son funcionalidad del producto (importar listas con columna email, enviar tickets por correo) porque no son canales de contacto de Chequi.
- No se toca el campo email del login/registro: es autenticación, no contacto.

## 2. Número oficial único
- El CTA final todavía apunta al número antiguo (`573505175312`). Se actualiza a `573204963384`.
- El número y el mensaje pre-escrito de WhatsApp se centralizan en una constante compartida para que no vuelvan a divergir.

## 3. Botón flotante de WhatsApp
- Nuevo componente flotante fijo en la esquina inferior derecha de la landing.
- Diseño alineado a la identidad actual (fondo oscuro `empresarial`, acento `dorado`):
  - Pastilla dorada con ícono de WhatsApp e texto "Escríbenos" que se expande al pasar el cursor y queda como círculo compacto en móvil.
  - Halo suave animado (pulso lento) y sombra dorada para atraer la mirada sin ser invasivo.
  - Aparece tras hacer scroll un poco (no compite con el hero) y respeta `prefers-reduced-motion`.
- Posicionado por encima de la barra de patrocinadores para no solaparse.
- Etiqueta accesible (`aria-label`) y área táctil mínima de 56px.

## Detalles técnicos
- Nuevo `src/lib/contact.ts` con `WHATSAPP_NUMBER`, `WHATSAPP_MESSAGE` y `getWhatsAppUrl()`.
- Nuevo `src/components/landing/FloatingWhatsApp.tsx`, montado en `src/pages/Index.tsx`.
- Tokens de color y la animación de pulso se definen en `index.css` / `tailwind.config.ts`; sin colores hardcodeados en componentes.
- Archivos editados: `FAQ.tsx`, `LandingFooter.tsx`, `FinalCTA.tsx`, `Index.tsx`, `src/i18n/locales/{es,en}/landing.json`.
