# Restaurar insights en vivo para el evento Kenvue

## Diagnóstico (verificado en base de datos y en producción)

- **No hay pérdida de datos**: 270 consumos en `cedula_control_usage` (121 hoy, último a las 12:52 hora Colombia), 328 cédulas autorizadas, 4 controles (Acceso, Crispetas, Gaseosa, Refrigerio).
- **El fix de analítica YA está publicado** en chequi.online (verifiqué el bundle de producción: contiene el código nuevo).
- **Causa #1 — versión vieja en caché (PWA)**: la app instala un service worker que cachea la aplicación. Un dashboard abierto desde antes de publicar el arreglo sigue corriendo la versión vieja indefinidamente. No existe verificación periódica de versión ni recarga automática.
- **Causa #2 — secciones aún conectadas solo a QR**: la pestaña "Summary" de Admin, los 5 KPIs superiores de Admin, y los porcentajes de "Cobertura" usan `attendees`/`control_usage` (tablas QR, vacías en este evento), por eso muestran ceros aunque el resto ya combine datos de cédula.

## ACCIÓN INMEDIATA (sin código, díganle al cliente YA)

En el dispositivo del cliente: **cerrar la pestaña/app y volver a abrir chequi.online** (o recargar 2 veces). Con eso cargará la versión publicada con los datos en vivo. Los datos aparecerán completos porque están en la base.

## Cambios de código (solo frontend, no disruptivos, sin tocar esquema)

### 1. Auto-actualización de versión en pantallas abiertas
- En el registro del service worker, agregar verificación periódica de actualización (cada 60s) y recarga automática controlada cuando hay versión nueva.
- Garantiza que cualquier arreglo futuro llegue a dashboards abiertos durante el evento sin intervención manual.

### 2. Pestaña "Summary" de Admin con datos de cédula
- `src/pages/Admin.tsx`: "Uso por tipo de control" pasará a combinar QR + `cedula_control_usage` (conteo por `control_type_id`).
- "Asistentes por categoría": cuando el evento es de cédulas, mostrar personas únicas escaneadas y total de autorizadas (con desglose por categoría solo si existe).

### 3. KPIs superiores de Admin unificados
- Total Asistentes = asistentes QR + cédulas autorizadas (328).
- Con Registros = personas únicas con escaneo (QR + cédula).
- Total Usos = usos QR + consumos cédula.
- Sin Registros = total − con registros.
- "Con QR" se oculta o se muestra como "Autorizados" cuando el evento es de cédulas.

### 4. "Cobertura" con denominador correcto
- `useAdvancedAnalytics.ts` (coverageAnalysis): cuando hay cédulas autorizadas, calcular cobertura por control como cédulas únicas escaneadas / total autorizadas (en vez de dividir por `attendees.length` = 0).
- Cobertura por categoría: usar categorías de `cedulas_autorizadas` si existen; si no (caso actual, categoría vacía), mostrar una sola fila "General" con escaneados/autorizados.

## Verificación
- Confirmar con datos reales del evento: Resumen/Tendencias con la curva horaria de los 121 escaneos de hoy, Cobertura mostrando ~X/328 por control, Summary con conteos por control > 0, y que un nuevo escaneo actualice todo en <2s.
- Revisar que Scanner y registro de cédulas no se vean afectados (cambios solo de lectura/presentación).

## Notas técnicas
- Sin migraciones ni cambios de RLS (los roles admin/control ya leen las tablas de cédula correctamente).
- Cumple la restricción de despliegue no disruptivo a mitad de evento: solo UI condicional y registro de SW.
- Tras implementar, hay que **Publicar** para que llegue a chequi.online.