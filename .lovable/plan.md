# Patrocinadores, eliminar eventos, logos en login, móvil y Scanner

## 1. Subida de logos de patrocinadores (falla actual)
- Causa verificada: los permisos de subida de imágenes solo aceptan usuarios con rol "admin"; un super admin sin ese rol (o un admin de otro evento) recibe "violates row-level security policy".
- Solución: permitir subir, reemplazar y borrar imágenes del evento a admins y super admins, guardando cada archivo dentro de la carpeta de su evento.
- Mensajes de error claros en español si falla la subida.

## 2. Eliminar otros eventos
- Botón "Eliminar evento" en Configuración, solo para super admin, con doble confirmación (escribir el nombre del evento).
- Elimina el evento y todos sus datos relacionados (asistentes, categorías, controles, registros, plantillas, asignaciones, kiosko) en una sola operación segura del servidor.
- No se permite eliminar el evento activo sin desactivarlo primero.

## 3. Logos de patrocinadores/asociados en la pantalla de ingreso
- Nueva sección para super admin: "Logos en pantalla de ingreso" (subir, ordenar, ocultar, eliminar, enlace opcional, etiqueta "Patrocinador" / "Aliado").
- Diseño elegante: franja inferior translúcida con desenfoque, logos en escala de grises que toman color al tocar, desplazamiento suave continuo si son muchos, tamaño adaptado al móvil, sin tapar el formulario.
- Independiente de los patrocinadores de cada evento.

## 4. Revisión completa de navegación móvil (95% del uso)
Revisión pantalla por pantalla a 360, 390 y 430 px de ancho: Ingreso, Scanner (QR, cédula, kiosko), Dashboard, Análisis, Resumen, Asistentes, Configuración, Plantillas, Exportación, Usuarios, Perfil.
- Corregir superposiciones (barra de patrocinadores, botón de WhatsApp, avisos, botones flotantes vs. contenido).
- Barra de navegación inferior fija con las secciones principales y respeto de la zona segura del iPhone.
- Encabezado compacto; pestañas desplazables; tablas convertidas en tarjetas; diálogos a pantalla completa en móvil; botones táctiles de al menos 44 px; teclado que no tape campos.
- Capturas de antes/después para cada pantalla como verificación.

## 5. Scanner — selector de evento
- Mostrar solo eventos activos.
- Si hay un solo evento activo: se selecciona automáticamente y el selector no aparece.
- Solo con dos o más eventos activos simultáneos se muestra el selector.

## 6. Kiosko — lectura autónoma de documentos
- Igual que con QR: la cámara queda abierta, detecta la cédula en el cuadro, captura sola cuando la imagen está estable y nítida, la lee con IA, valida contra la lista autorizada y registra el uso sin tocar la pantalla.
- Muestra el resultado (permitido / rechazado / ya registrado, mesa asignada) y vuelve a esperar el siguiente documento.
- En kiosko se omite la confirmación manual solo cuando la lectura es confiable (número de cédula claro); si es dudosa, pide reintentar.
- Pausa entre capturas para no leer dos veces la misma cédula ni gastar créditos de IA de más.
- Sin conexión: guarda en la cola local como hoy.

## Notas
- La lectura automática consume créditos de IA por cada intento; la cuenta debe tener saldo.
- No se cambia el contenido de los QR ya distribuidos.

## Detalles técnicos
- Storage `event-assets`: nuevas políticas INSERT/UPDATE/DELETE con `is_super_admin(auth.uid()) OR (user_has_role_secure(auth.uid(),'admin') AND user_can_access_event((storage.foldername(name))[1]::uuid))`; rutas `"<event_id>/..."` en `EventImageUploader` y `SponsorLogosManager`.
- RPC `delete_event_cascade(p_event_id)` SECURITY DEFINER, `search_path public`, verifica `is_super_admin`, borra en orden de FKs.
- Tabla `login_partner_logos` (name, logo_url, link_url, kind, sort_order, is_visible) con GRANT SELECT a anon, escritura solo super admin; componente en `Auth.tsx`.
- `EventSelector`/`Scanner.tsx`: filtrar `is_active`, auto-seleccionar si hay uno.
- Kiosko cédula: bucle de captura con detección de nitidez/estabilidad (varianza del Laplaciano sobre canvas), cooldown, llamada a `scan-cedula-ai`, auto-confirmación con umbral; reutiliza cola offline.
- Verificación con Playwright en viewports móviles.
