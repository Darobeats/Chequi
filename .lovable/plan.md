
# Plan: Personalización Visual del HUB por Evento

## Problema Actual

La configuración de eventos tiene campos para logo y colores, pero:
1. Los campos `logo_url` y `event_image_url` solo aceptan URLs manuales (no se pueden subir archivos)
2. El `ThemeContext` aplica colores y fuente globalmente usando `get_active_event_config()` (busca un evento "activo" global), no el evento seleccionado del usuario
3. No existe campo para imagen de fondo (background) del dashboard/scanner
4. No hay soporte para logos de patrocinadores/organizadores
5. Los colores configurados no se reflejan visualmente en el Header, cards, ni botones de la app
6. No hay vista previa real de cómo se verá el evento

## Solución Propuesta

### 1. Migración de Base de Datos

Agregar nuevos campos a `event_configs`:

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `background_url` | text | Imagen de fondo del HUB |
| `sponsor_logos` | jsonb | Array de logos de patrocinadores `[{name, url, link}]` |
| `welcome_message` | text | Mensaje personalizado de bienvenida |
| `background_opacity` | numeric | Opacidad del fondo (0.05 a 0.5) |

Crear un nuevo **storage bucket** `event-assets` (público) para subir logos, fondos e imágenes de patrocinadores directamente desde la app.

### 2. Subida de Archivos (reemplazar URLs manuales)

Crear componente `EventImageUploader.tsx` que permita:
- **Arrastrar y soltar** o **seleccionar archivo** para subir imágenes
- Vista previa inmediata del archivo subido
- Subida automática al bucket `event-assets` con path `{event_id}/logo.png`, `{event_id}/background.jpg`, etc.
- Botón para eliminar imagen actual

Se usará en EventConfig para:
- Logo del evento (reemplaza campo URL manual)
- Imagen de fondo del HUB (nuevo)
- Imagen del evento (reemplaza campo URL manual)

### 3. Logos de Patrocinadores/Organizadores

Agregar sección en EventConfig tab "Config" para gestionar logos de patrocinadores:
- Botón "Agregar Patrocinador"
- Cada patrocinador: nombre, logo (subido), link opcional
- Máximo 6 patrocinadores
- Los logos se muestran en el footer del Header o en una barra inferior dedicada

### 4. ThemeContext: Usar Evento Seleccionado

Refactorizar `ThemeContext.tsx` para:
- Usar el `selectedEvent` del `EventContext` en vez de `get_active_event_config()`
- Aplicar dinámicamente colores, fuente, logo y fondo según el evento del usuario
- Actualizar las CSS variables `--primary`, `--accent`, etc. con los colores del evento
- Esto hace que **cada usuario vea la app con el branding de SU evento**

### 5. Aplicación Visual del Branding

**Header.tsx:**
- Mostrar el logo del evento (si existe) junto al título "CHEQUI"
- Usar el `primary_color` del evento como color del borde inferior
- Barra de logos de patrocinadores debajo del header (si existen)

**Admin.tsx y Scanner.tsx:**
- Fondo con la imagen configurada (con opacidad controlada)
- Cards y badges usando los colores del evento
- Mensaje de bienvenida personalizado visible en el dashboard

**Footer de todas las páginas internas:**
- Logos de patrocinadores en fila horizontal
- "Powered by Chequi" junto con los logos

### 6. Vista Previa en EventConfig

Reemplazar la mini-preview actual (un rectángulo de 96px) por una vista previa más completa que muestre:
- Header con logo
- Card de ejemplo con los colores configurados
- Fondo con la imagen subida
- Logos de patrocinadores en la parte inferior

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/EventImageUploader.tsx` | Componente de subida de imágenes con drag & drop |
| `src/components/SponsorLogosManager.tsx` | CRUD de logos de patrocinadores |
| `src/components/SponsorLogosBar.tsx` | Barra visual de logos de patrocinadores |
| `src/components/EventBrandingPreview.tsx` | Vista previa del branding completo |

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| Migración SQL | Nuevos campos + bucket `event-assets` + RLS |
| `src/types/database.ts` | Agregar campos nuevos a `EventConfig` |
| `src/context/ThemeContext.tsx` | Usar `selectedEvent` del EventContext, aplicar fondo y logo |
| `src/components/EventConfig.tsx` | Reemplazar inputs URL por uploaders, agregar sección patrocinadores, mejor preview |
| `src/components/Header.tsx` | Mostrar logo del evento, borde con color del evento |
| `src/pages/Admin.tsx` | Fondo personalizado, mensaje bienvenida |
| `src/pages/Scanner.tsx` | Fondo personalizado del evento |
| `src/index.css` | CSS variables para fondo y nuevas propiedades dinámicas |
| `src/hooks/useEventConfig.ts` | Asegurar que los nuevos campos se incluyan en queries |

## Detalle Técnico: ThemeContext Refactorizado

```typescript
// Antes: usa get_active_event_config() - un solo evento global
const { data: eventConfig } = useActiveEventConfig();

// Después: usa selectedEvent del contexto del usuario
const { selectedEvent } = useEventContext();
// Aplica colores, logo, fondo del evento seleccionado por ESE usuario
```

Esto significa que si dos usuarios están en eventos diferentes, cada uno verá el branding de su evento.

## Detalle Técnico: Storage

```sql
-- Bucket para assets de eventos
INSERT INTO storage.buckets (id, name, public) VALUES ('event-assets', 'event-assets', true);

-- RLS: admins del evento pueden subir/borrar
CREATE POLICY "Admins can upload event assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-assets' AND ...);
```

Path convention: `{event_id}/logo.png`, `{event_id}/background.jpg`, `{event_id}/sponsors/{sponsor_name}.png`

## Resultado Esperado

1. Admin sube logo del evento -> aparece en el Header para todos los usuarios de ese evento
2. Admin sube fondo -> aparece como background en Dashboard y Scanner
3. Admin agrega logos de patrocinadores -> aparecen en barra inferior
4. Colores configurados se aplican realmente a botones, bordes, badges
5. Cada evento tiene su propia identidad visual completa
6. Los organizadores sienten la herramienta como "suya"
