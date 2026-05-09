# Design System de HistoriAR

Tokens y referencia visual extraídos de Pinterest ("Bright Workshop Canvas") como base del lenguaje visual de HistoriAR.

> **Theme**: light, canvas blanco amplio. Énfasis en tipografía grande y CTAs vibrantes (Pinterest Red). Esquinas redondeadas (16-20 px), sin sombras (depth se da con color y espacio), sin gradientes.

## Archivos

| Archivo | Para qué |
|---|---|
| `STYLE_GUIDE.md` | Referencia completa: roles de cada color, tipografía, do's & don'ts, ejemplos de componentes (CTA, ghost button, navlinks). **Léelo antes de diseñar cualquier pantalla nueva.** |
| `tokens.json` | Tokens en formato W3C Design Tokens (canónico). Útil si en algún momento generamos plataformas (Figma, iOS, Android) desde la misma fuente. |
| `variables.css` | Custom properties CSS listas para usar en cualquier proyecto (Tailwind v3 + CSS variables). |
| `theme.css` | Misma cosa pero en sintaxis `@theme` de **Tailwind v4**. |

## Tokens clave (resumen rápido)

### Colores
- **Texto**: `#211922` (Graphite) — primario de body.
- **Texto principal**: `#000000` (Jet Black) — botones, navegación.
- **Fondo**: `#ffffff` (Canvas White).
- **CTA**: `#e60023` (Pinterest Red) — solo para acción primaria.
- **Acento headline**: `#9270d7` (Idea Violet) — algunos titulares.
- **Link**: `#2b48d4` (Discovery Blue).
- **Border input**: `#8c8c8c` (Muted Slate).

### Tipografía
- **Family**: `Pin Sans` (sustitutos: Open Sans, Arial). Letter-spacing negativo (-0.037em).
- **Pesos**: 400, 500, 600, 700, 900.
- **Escala**: 14 / 16 / 20 / 32 / 38 / 50 / 70 px.

### Spacing & Shapes
- **Base unit**: 4 px.
- **Escala**: 4, 8, 12, 16, 20, 24, 32, 48, 80, 100.
- **Section gap**: 80 px. **Card padding**: 16 px.
- **Border radius**:
  - Cards: 20 px
  - Buttons & inputs: 16 px
  - Nav items: 12 px
  - Full pill: 999 px

## Cómo aplicar en HistoriAR

### Tailwind v4 (decidido y aplicado)

`web/` corre **Tailwind CSS v4** vía `@tailwindcss/vite`. Sin `tailwind.config.js`, sin `postcss.config.js`. Los tokens viven en un bloque `@theme {…}` dentro de `web/src/index.css` y generan utilities automáticamente (`bg-pinterest-red`, `text-graphite`, `rounded-card`, `text-body-lg`, etc.).

El theme está adaptado de los archivos canónicos:
- `theme.css` aquí en `docs/design-system/` es la **referencia**.
- `web/src/index.css` es la **aplicación viva** del theme + globales (Inter, base reset, `.theme-ar` para dark overlay).

### Adaptaciones específicas para HistoriAR

El estilo Pinterest es **tema claro** (canvas blanco). HistoriAR tiene una pantalla AR que es **inherentemente oscura** (cámara + UI overlay). Probablemente convenga:

- **Pantallas estándar** (Home, Mapa, Perfil, Feed, Medallas): **light theme** Pinterest tal cual.
- **Pantalla AR** (`ARPage`): **dark overlay theme** — UI flotante sobre la cámara, contraste alto. Reusar la paleta pero invertir backgrounds (Graphite/Jet Black como fondo, Canvas White como texto).
- **Pinterest Red** se mantiene como CTA en ambos modos.

### Pin Sans → Inter (decidido y aplicado)

Pin Sans es propietaria de Pinterest. HistoriAR usa **Inter** desde Google Fonts (cargada en `web/index.html` con preconnect) y aplica `letter-spacing: -0.037em` global para mantener el feel compacto del original.

## Estado de aplicación

- ✅ Tokens portados a Tailwind v4 en `web/src/index.css`.
- ✅ Inter cargado.
- ✅ `HomePage` rediseñada con tokens Pinterest.
- ✅ `ARPage` con dark overlay (`.theme-ar` aplicado al `<html>` mientras está montada).

## Pendiente

- Pantallas restantes: Perfil, Feed social, Buscar gente, Detalle de medalla. Aplicar mismo lenguaje (light + Pinterest Red CTA).
- Iconografía: definir set (Lucide React encaja bien con Inter / Pinterest aesthetic).
- Estados de loading y error con tono de "workshop" (no spinners genéricos).
