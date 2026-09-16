# Textos legales definitivos (versión 1.0)

Se reemplazan los borradores por la redacción revisada, se añade el Aviso de Privacidad como documento propio y se actualiza el pie de página. No se toca registro, generación de QR, escaneo, exportación ni dashboard.

## 1. Documentos en versión 1.0

Se sustituye el contenido de:

- `/legal/terminos` — Términos y Condiciones de Uso (15 apartados: identificación, objeto, relación con el organizador, códigos QR, reportes, responsabilidad sobre la información, menores de edad, disponibilidad, uso adecuado, propiedad intelectual, confidencialidad, finalización, modificaciones, ley y jurisdicción, contacto).
- `/legal/privacidad` — Política de Tratamiento de Datos Personales (12 apartados).
- `/legal/cookies` — Política de Cookies (5 apartados).
- `/legal/gdpr` — Privacidad internacional y GDPR, sin afirmar cumplimiento del GDPR.
- `/legal/ia` — Política sobre Uso de Inteligencia Artificial.

Todos pasan a "Versión 1.0 · septiembre de 2026" y se retira el aviso amarillo de "pendiente de revisión legal", que deja de mostrarse cuando un documento está marcado como definitivo. El componente conserva la capacidad de mostrar ese aviso para futuros borradores.

## 2. Nuevo Aviso de Privacidad

Nueva página `/legal/aviso` con el texto entregado: quién trata los datos (el organizador), el papel de Chequi como Encargado, las finalidades (registro, generación y validación de QR, control de acceso y reportes), la referencia a la legislación colombiana y el canal para ejercer derechos. Se enlaza desde el pie de página y desde el aviso corto que ya aparece sobre los formularios que recogen datos personales.

## 3. Ajuste sobre inteligencia artificial

El texto entregado afirma que Chequi no usa IA para lectura automatizada de documentos de identidad, pero la herramienta sí tiene hoy lectura asistida de cédula. Se publica la versión corregida y verdadera:

- La generación y validación de códigos QR y el control de acceso no usan IA: son procesos deterministas de la plataforma.
- Sí existe una función opcional de lectura asistida de la cédula a partir de una fotografía, siempre con verificación humana antes de guardar, y nunca decide el acceso por sí sola.
- Se mantiene que no hay reconocimiento facial ni identificación biométrica.

Se aplica la misma corrección en la Política de Privacidad, donde el texto original decía que no hay lectura automatizada de documentos.

## 4. Correo de contacto

`info@chequi.online` se incorpora únicamente dentro de las páginas legales (secciones de contacto, consultas y reclamos). El resto del sitio —pie, FAQ, botón flotante, llamados a la acción— sigue con WhatsApp como único canal, tal como está hoy.

## 5. Pie de página

Enlaces legales: Términos y Condiciones · Aviso de Privacidad · Privacidad · Cookies · GDPR · Uso de IA, con `© Chequi / DarocodeIA`. Se generan automáticamente desde la configuración legal.

## Verificación de referencias legales

Los textos no citan números de ley ni decretos concretos, así que no hay riesgo de citar una norma inexistente. Se conserva la redacción genérica "legislación colombiana aplicable" y la mención a la SIC como autoridad de protección de datos, que es correcta. Se elimina de la página de GDPR la referencia al "artículo 28 del GDPR" del borrador anterior y se sustituye por la redacción entregada, que no afirma cumplimiento. No se añade ninguna certificación ni garantía.

## Detalles técnicos

- `src/lib/legal.ts`: contenido de los cinco documentos en versión 1.0, nuevo documento `aviso`, campo de estado por documento (definitivo/borrador), constante de correo legal y versión de consentimiento actualizada a 1.0.
- `src/components/legal/LegalPageLayout.tsx`: el aviso de "pendiente de revisión legal" solo se renderiza para documentos en borrador; se añade el correo legal al bloque de contacto.
- `src/components/legal/PrivacyNotice.tsx` y `ConsentCheckbox.tsx`: enlace adicional al Aviso de Privacidad y texto de autorización alineado con la política definitiva.
- `public/sitemap.xml`: alta de `/legal/aviso`.
- Sin migraciones de base de datos y sin cambios en la lógica de la aplicación.
