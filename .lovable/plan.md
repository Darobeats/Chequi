# Términos y Condiciones de Chequi — identificación del titular y vigencia

## Objetivo
Reescribir los Términos y Condiciones como documento definitivo, identificando al titular únicamente como **Cristian G**, conforme a la información autorizada, y estableciendo la vigencia en **septiembre de 2026**, sin inventar un día concreto.

## Cambios
- Identificar a Cristian G como titular que opera Chequi bajo el nombre DarocodeIA. No presentar DarocodeIA como sociedad constituida ni añadir apellidos, NIT, identificación, registro mercantil o dirección no proporcionados.
- Sustituir la frase actual que anuncia que la identificación completa se incorporará al formalizar la estructura jurídica. No incluir marcadores de borrador ni promesas de información futura.
- Reorganizar la redacción de los Términos para distinguir al titular/prestador, la plataforma Chequi y el cliente u organizador, manteniendo las condiciones sustantivas sobre servicio, QR, reportes, datos personales, menores, disponibilidad, uso lícito, propiedad intelectual, confidencialidad, finalización y jurisdicción colombiana.
- Incorporar expresamente «Vigencia: septiembre de 2026» en los Términos y mantener su estado definitivo. La fecha de actualización ya figura como septiembre de 2026; no cambiar las fechas de los otros documentos.
- Mantener el contacto legal `info@chequi.online` y la dirección pública `/legal/terminos`.

## Límite jurídico
La identificación autorizada es parcial: «Cristian G» no permite verificar por sí sola la identidad jurídica completa del prestador. El documento se publicará como definitivo por instrucción del titular, sin afirmar que esta identificación constituye acreditación jurídica completa ni que la nueva redacción haya sido revisada por abogado.

## Detalles técnicos
- Modificar exclusivamente la entrada `terminos` de `LEGAL_DOCUMENTS` en `src/lib/legal.ts`, conservando el estado `final` y sin alterar la configuración compartida por los demás documentos.
- Mantener el enlace existente del pie de página y el diseño de la página legal.
- Sin cambios en formularios, consentimiento, registro, QR, escaneo, exportación, analítica ni Supabase.

## Verificación
- Comprobar en `/legal/terminos` la identificación «Cristian G», la vigencia de septiembre de 2026 y la ausencia del aviso de borrador y de la frase de formalización futura.
- Verificar que el enlace del pie abre los Términos y que los otros cinco documentos legales conservan sus textos y fechas.