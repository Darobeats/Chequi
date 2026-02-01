
# Plan de Internacionalización (i18n) para Chequi

## Objetivo
Implementar soporte multilingüe (Español/Inglés) con detección automática del idioma del navegador y opción manual de cambio de idioma, preparando la aplicación para tráfico de Estados Unidos.

---

## Alcance

### Páginas a traducir:
1. **Landing Page completa** (10 componentes)
   - LandingHero, ProblemSolution, KeyFeatures, UseCases, Benefits, HowItWorks, Testimonials, FAQ, FinalCTA, LandingFooter
2. **Header** (navegación y botones)
3. **Auth** (página de login)
4. **Componentes comunes** (botones, mensajes, etc.)

### Idiomas soportados:
- Español (es) - Idioma por defecto
- Inglés (en) - Para visitantes de US/UK

---

## Arquitectura de la Solución

### Dependencias a instalar:
```
i18next
react-i18next
i18next-browser-languagedetector
```

### Estructura de archivos:
```
src/
├── i18n/
│   ├── index.ts              # Configuración de i18next
│   └── locales/
│       ├── es/
│       │   ├── common.json   # Textos comunes (botones, nav)
│       │   └── landing.json  # Textos de landing page
│       └── en/
│           ├── common.json
│           └── landing.json
├── components/
│   ├── LanguageSwitcher.tsx  # Selector de idioma
│   └── LanguagePrompt.tsx    # Popup de sugerencia de idioma
```

---

## Detalle Técnico

### 1. Configuración i18next (`src/i18n/index.ts`)
- Usar `i18next-browser-languagedetector` para detectar el idioma del navegador
- Detecta por: `navigator.language`, `navigator.languages`, cookies, localStorage
- Fallback a español si el idioma no es soportado
- Guardar preferencia en localStorage para futuras visitas

### 2. Detección y Prompt de Idioma (`LanguagePrompt.tsx`)
Componente que aparece cuando:
- El navegador detecta idioma inglés (en, en-US, en-GB)
- El usuario no ha visto el prompt antes (verificar localStorage)

Diseño del prompt:
- Popup discreto en la esquina inferior derecha
- Mensaje: "We detected your browser is in English. Would you like to view this page in English?"
- Botones: "Yes, switch to English" | "No, keep Spanish"
- Opción "Don't ask again"
- Se cierra automáticamente después de 10 segundos

### 3. Selector de Idioma (`LanguageSwitcher.tsx`)
- Ubicación: En el Header, junto a los botones de navegación
- Diseño: Dropdown con banderas o iconos de globo
- Opciones: "ES 🇨🇴" | "EN 🇺🇸"
- Cambio instantáneo sin recarga de página
- Guarda preferencia en localStorage

### 4. Modificaciones al Header
Agregar el `LanguageSwitcher` visible en:
- Landing page (siempre visible)
- Páginas de la app (visible para usuarios autenticados)

---

## Archivos de Traducciones

### `src/i18n/locales/es/landing.json` (ejemplo parcial):
```json
{
  "hero": {
    "title": "Control de Acceso Profesional para Eventos de Alto Impacto",
    "subtitle": "Gestiona desde 100 hasta 50,000+ asistentes con tecnología QR en tiempo real",
    "cta_demo": "Solicitar Demo",
    "cta_dashboard": "Ir al Dashboard",
    "cta_learn": "Ver Cómo Funciona",
    "bullet1": "Control en tiempo real desde cualquier dispositivo",
    "bullet2": "0% fraude con códigos QR únicos e intransferibles",
    "bullet3": "Reportes empresariales instantáneos y exportables"
  },
  "features": {
    "title": "Todo lo que Necesitas para el Control Total de tu Evento",
    "subtitle": "Funcionalidades empresariales diseñadas para eventos de cualquier escala"
  }
}
```

### `src/i18n/locales/en/landing.json` (ejemplo parcial):
```json
{
  "hero": {
    "title": "Professional Access Control for High-Impact Events",
    "subtitle": "Manage from 100 to 50,000+ attendees with real-time QR technology",
    "cta_demo": "Request Demo",
    "cta_dashboard": "Go to Dashboard",
    "cta_learn": "See How It Works",
    "bullet1": "Real-time control from any device",
    "bullet2": "0% fraud with unique, non-transferable QR codes",
    "bullet3": "Instant exportable enterprise reports"
  },
  "features": {
    "title": "Everything You Need for Total Event Control",
    "subtitle": "Enterprise features designed for events of any scale"
  }
}
```

---

## Componentes a Modificar

### Landing Components (10 archivos):
1. `LandingHero.tsx` - Usar `useTranslation()` hook
2. `ProblemSolution.tsx` - Traducir problemas y soluciones
3. `KeyFeatures.tsx` - Traducir 6 features con títulos y descripciones
4. `UseCases.tsx` - Traducir 5 casos de uso con detalles
5. `Benefits.tsx` - Traducir métricas y beneficios
6. `HowItWorks.tsx` - Traducir 3 pasos con tareas
7. `Testimonials.tsx` - Traducir testimonios y cargos
8. `FAQ.tsx` - Traducir 10 preguntas y respuestas
9. `FinalCTA.tsx` - Traducir CTAs y estadísticas
10. `LandingFooter.tsx` - Traducir links y contacto

### Otros componentes:
11. `Header.tsx` - Agregar LanguageSwitcher
12. `Auth.tsx` - Traducir formulario de login
13. `main.tsx` - Importar configuración i18n

---

## Flujo de Usuario

```text
┌─────────────────────────────────────────┐
│  Usuario visita chequi.lovable.app      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  i18next detecta idioma del navegador   │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│ Español (es)  │   │ Inglés (en)   │
│ Mostrar sitio │   │ Mostrar popup │
│ en español    │   │ "Switch to    │
│               │   │  English?"    │
└───────────────┘   └───────┬───────┘
                            │
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
             ┌──────────┐   ┌──────────┐
             │ "Yes"    │   │ "No"     │
             │ Cambiar  │   │ Mantener │
             │ a inglés │   │ español  │
             └──────────┘   └──────────┘
                    │               │
                    ▼               ▼
             ┌─────────────────────────┐
             │ Guardar preferencia en  │
             │ localStorage            │
             └─────────────────────────┘
```

---

## Consideraciones Adicionales

1. **SEO**: Las URLs no cambiarán (no usaremos /en/ o /es/), el contenido se traduce dinámicamente
2. **Performance**: Los archivos de traducción son pequeños (~5KB cada uno)
3. **Mantenimiento**: Estructura clara de JSON para futuras traducciones
4. **Escalabilidad**: Fácil agregar más idiomas (portugués, etc.)

---

## Estimación

| Fase | Descripción | Archivos |
|------|-------------|----------|
| 1 | Configuración i18next + dependencias | 2 nuevos |
| 2 | Archivos de traducción ES | 2 nuevos |
| 3 | Archivos de traducción EN | 2 nuevos |
| 4 | Componentes nuevos (Switcher + Prompt) | 2 nuevos |
| 5 | Modificar landing components | 10 existentes |
| 6 | Modificar Header y Auth | 2 existentes |
| **Total** | | **8 nuevos + 12 modificados** |

---

## Resultado Esperado

1. Visitantes con navegador en inglés verán un popup preguntando si desean ver el sitio en inglés
2. Selector de idioma visible en el Header para cambio manual
3. Preferencia guardada para futuras visitas
4. Contenido 100% traducido en landing page y auth
5. Aplicación preparada para tráfico internacional de US
