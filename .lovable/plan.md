
## Problema

El módulo Análisis actual desperdicia espacio (una gráfica por fila en desktop), muestra información poco "diciente" (gráficas con una sola barra sin contexto, sin nombres de categoría/control en KPIs), y en mobile obliga a scroll infinito para ver algo. El objetivo: en una sola pantalla se debe entender qué está pasando por **categoría de ticket** (invitados, socios, VIP, etc.) y por tipo de control.

## Rediseño

### 1. Nueva estructura de pantalla (una sola vista, sin tabs profundos)

Eliminar el modelo de 5 tabs (Resumen / Tendencias / Cobertura / En Vivo / Detalles). Se reemplaza por **una vista principal densa** + un único desplegable "Ver detalles crudos" al final para la tabla.

```text
┌────────────────────────────────────────────────────┐
│ Filtros (colapsables en mobile) + KPIs compactos   │
├──────────────────────┬─────────────────────────────┤
│ CATEGORÍAS (foco)    │ RITMO / TENDENCIA           │
│ - Barras horizontales│ - Área acumulada + ritmo    │
│   por categoría con  │ - Chip pico / proyección    │
│   % participación,   │                             │
│   ingresados / total │                             │
├──────────────────────┼─────────────────────────────┤
│ TIPOS DE CONTROL     │ ACTIVIDAD EN VIVO           │
│ - Barras + donut     │ - Últimos 8 scans con       │
│   cobertura          │   color de categoría        │
├──────────────────────┴─────────────────────────────┤
│ HEATMAP CATEGORÍA × HORA (una sola matriz clara)   │
├────────────────────────────────────────────────────┤
│ ▸ Ver registros detallados (tabla, colapsado)      │
└────────────────────────────────────────────────────┘
```

### 2. KPIs compactos (una sola fila, scroll horizontal en mobile)

Reducir de 6 tarjetas grandes a **4 KPIs esenciales** en tira horizontal:
- Ingresos totales (con delta vs hora anterior)
- Asistentes únicos / total con barra de progreso
- Pico de actividad (hora + conteo)
- Proyección final (si es evento en curso)

Cada tarjeta ≈ 140px de ancho, altura reducida, ícono a la izquierda, valor grande, sub-label. En mobile: `overflow-x-auto snap-x`.

### 3. Bloque CATEGORÍAS (nuevo, el más importante)

Componente nuevo `CategoryBreakdownPanel` que muestra por cada categoría de ticket:
- Nombre + color de la categoría
- Barra horizontal con % participación
- Números: `ingresados / total autorizados` y `usos totales`
- Micro-sparkline (últimas 12 horas) para ver ritmo
- Ordenado por volumen descendente

En desktop se ve tipo "league table" con todas las categorías visibles sin scroll. En mobile ocupa el 100% del ancho y cada fila es tocable para expandir detalle.

### 4. Bloque TIPOS DE CONTROL

`ControlTypePanel` compacto:
- Donut pequeño (140px) con distribución % entre tipos
- Al lado, lista de tipos con conteo + cobertura %
- Sustituye a `CoverageMetrics` actual (muy verboso, 2 tarjetas gigantes)

### 5. Heatmap Categoría × Hora

Reemplaza el `CategoryBreakdownChart` de barras apiladas (ilegible con pocos datos) por un **heatmap** filas=categorías, columnas=horas, celda coloreada con el color de la categoría y opacidad = intensidad. Muy legible incluso con 1-2 scans. En mobile: scroll horizontal en el eje de horas, con la primera columna (nombre de categoría) sticky.

### 6. Actividad en vivo compacta

`LiveActivityFeed` se reduce a los **últimos 8 scans** en formato lista fina: hora, punto de color (categoría), nombre, tipo de control. Sin card gigante.

### 7. Tendencia unificada

`TrendAnalysis` actual tiene 4 secciones grandes en single-day. Se reduce a **un único gráfico compuesto**: barras por hora + línea de acumulado + marcadores de picos. Los KPIs de "ritmo actual / proyección / próximo hito" se mueven a la fila de KPIs (punto 2).

### 8. Optimización mobile

- Grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` en el contenedor principal, con reordenamiento (`order-*`) para que en mobile aparezca primero: KPIs → Categorías → Actividad en vivo → Ritmo → Heatmap → Controles → Detalles.
- Filtros en un `<details>` colapsable en mobile (por defecto cerrado), abiertos en desktop.
- Alturas fijas menores: charts a `h-[200px]` en mobile, `h-[260px]` desktop.
- Padding reducido `p-3 sm:p-4` en cards.
- Sin `overflow-x-auto` innecesario que rompe scroll vertical.

### 9. Filtros mejorados

Agregar un filtro extra visible: **selector de "Ver por"** (Categoría / Tipo de Control) que resalta ese eje en todos los gráficos con el color correspondiente. Rango por defecto pasa a "today" con chips rápidos (Hoy · Últ. hora · Todo) en vez del `Select` largo.

## Archivos a modificar / crear

- **Modificar** `src/components/ControlAnalytics.tsx` — nuevo layout, sin tabs, con secciones ordenadas y responsive.
- **Crear** `src/components/analytics/AnalyticsKPIStrip.tsx` — reemplaza `EnhancedKPIs.tsx` con la tira compacta de 4 KPIs.
- **Crear** `src/components/analytics/CategoryBreakdownPanel.tsx` — league table de categorías con sparkline.
- **Crear** `src/components/analytics/ControlTypePanel.tsx` — donut + lista.
- **Crear** `src/components/analytics/CategoryHourHeatmap.tsx` — reemplaza `CategoryBreakdownChart.tsx`.
- **Modificar** `src/components/analytics/TrendAnalysis.tsx` — reducir a un solo gráfico compuesto por hora.
- **Modificar** `src/components/analytics/LiveActivityFeed.tsx` — formato lista compacta, 8 items.
- **Modificar** `src/components/analytics/CoverageMetrics.tsx` — se integra en `ControlTypePanel` o se elimina.
- **Modificar** `src/components/analytics/DetailedDataTable.tsx` — envolver en `<details>` colapsable.
- **Modificar** `src/hooks/useAdvancedAnalytics.ts` — agregar sparklines por categoría (últimas N horas por categoría) reutilizando `category_by_hour` que ya devuelve la RPC (no requiere cambios SQL).

## Detalles técnicos

- Se conservan las RPCs `get_event_analytics_summary` y `get_event_recent_activity` sin tocar SQL; toda la mejora es de presentación y agregación cliente.
- Colores de categoría vienen del campo `category_color` (ya expuesto por la RPC). Fallback a tokens `--chart-1..5` cuando falte.
- Se usan tokens semánticos existentes (`--primary`, `--muted`, `--card`, `--border`) — nada de colores hardcoded.
- Componentes shadcn: `Card`, `Progress`, `Badge`, `Sheet` (para filtros en mobile), `Collapsible` (para detalles).
- Recharts: `BarChart` horizontal para categorías, `PieChart` con innerRadius para donut, `ComposedChart` para ritmo, celdas SVG propias para heatmap (más liviano que Recharts para matrices pequeñas).
- No se toca el módulo de cédulas ni el scanner. Cambio 100% frontend/presentación.
