# Fase 1: Adecuación legal y de cumplimiento

Objetivo: dejar Chequi lista para operar comercialmente con una sección legal real y navegable, consentimiento explícito en los formularios que recogen datos personales, y una estructura modular para incorporar después los textos revisados por abogado. No se toca el registro, la generación de QR, el escaneo ni el dashboard.

## 1. Sección Legal navegable

Cuatro páginas nuevas, cada una con su propia dirección web:

- `/legal/terminos` — Términos y Condiciones
- `/legal/privacidad` — Política de Privacidad y Tratamiento de Datos
- `/legal/cookies` — Política de Cookies
- `/legal/gdpr` — GDPR / Privacidad Internacional

Todas comparten un mismo diseño (cabecera, título, fecha de última actualización, número de versión, índice lateral de secciones y pie), reutilizando el encabezado y el pie de la página pública que ya existen.

Cada página muestra un aviso visible: contenido provisional, pendiente de revisión legal. No se afirma ninguna certificación ni garantía de cumplimiento.

## 2. Consentimiento en formularios

Se añade un bloque reutilizable de consentimiento con:
- Casilla desmarcada por defecto (obligatoria para enviar).
- Texto de autorización de tratamiento de datos.
- Enlace directo a la Política de Privacidad (se abre en nueva pestaña).
- Registro de fecha/hora (hora de Bogotá) y versión del texto aceptado.

Se aplica en el registro manual de cédula y en el formulario de asistentes, que son los puntos donde se capturan datos personales. Cuando exista un campo donde guardar el consentimiento se guarda; si no, queda registrado en el propio envío y anotado como pendiente de persistencia (no se crean tablas nuevas en esta fase).

## 3. Aviso de privacidad en formularios

Nota corta y visible encima de cada formulario que recoge datos personales: quién es responsable, para qué se usan los datos y enlace a la política. Se usa en los mismos formularios y en la pantalla de acceso.

## 4. Roles Responsable / Encargado

Se crea un archivo único de configuración legal (`src/lib/legal.ts`) con:
- Datos del titular de la plataforma (Chequi / DarocodeIA) y canal de contacto por WhatsApp.
- Definición de roles: el organizador del evento es Responsable del Tratamiento; Chequi actúa como Encargado cuando procesa datos por cuenta del cliente.
- Versión y fecha de cada documento legal.

Las páginas legales y los textos de consentimiento leen de ahí, para que un cambio de texto o de versión se haga en un solo lugar.

## 5. Uso de inteligencia artificial

Página `/legal/ia` con la estructura de una futura Política de Uso Responsable de IA: qué funciones usan IA hoy (lectura asistida de cédulas), que siempre hay verificación humana, y marcadores de secciones pendientes de redacción legal.

## 6. Pie de página

Se reorganiza el pie: `© Chequi / DarocodeIA` y enlaces reales a Términos y Condiciones, Privacidad, Cookies y GDPR (más IA). Los enlaces legales dejan de ser botones sin acción.

## 7. Accesibilidad y responsive

Navegación por teclado, foco visible, jerarquía correcta de títulos, contraste adecuado y lectura cómoda en móvil (ancho de texto limitado, índice plegable). Cada página lleva su propio título y descripción para buscadores.

## Preparado para la revisión jurídica

Estructura lista para añadir sin rehacer nada: Política de Tratamiento completa, DPA/Acuerdo de Encargo, SLA, Política de Seguridad, Política de Retención y Eliminación, Política de IA. Basta con añadir un documento al archivo de configuración legal y una ruta.

## Detalles técnicos

- Nuevas rutas públicas en `src/App.tsx` bajo `/legal/*`.
- Nuevos archivos: `src/lib/legal.ts`, `src/components/legal/LegalPageLayout.tsx`, `src/components/legal/ConsentCheckbox.tsx`, `src/components/legal/PrivacyNotice.tsx`, `src/pages/legal/*.tsx`.
- Modificados: `src/App.tsx`, `src/components/landing/LandingFooter.tsx`, `src/components/cedula/CedulaManualRegistro.tsx`, `src/components/AttendeeForm.tsx`, traducciones ES/EN de landing y common.
- Sin migraciones de base de datos, sin cambios en escaneo, QR, exportación ni analítica.
