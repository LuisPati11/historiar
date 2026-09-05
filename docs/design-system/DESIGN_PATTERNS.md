# HistoriAR — Patrones de Diseño

Base visual: Pinterest "Bright Workshop Canvas" adaptada.  
Fuente: Inter (Google Fonts) en sustitución de Pin Sans.  
Framework: Tailwind CSS v4 con tokens en `web/src/index.css`.

---

## 1. Colores

| Token Tailwind | Valor hex | Uso principal |
|---|---|---|
| `canvas-white` | `#ffffff` | Fondo de página, superficies de tarjeta, texto sobre fondos oscuros |
| `jet-black` | `#000000` | Títulos principales, texto de mayor jerarquía |
| `graphite` | `#211922` | Texto secundario, cuerpo de texto, labels |
| `ash-gray` | `#666666` | Texto terciario, iconos inactivos, metadatos |
| `muted-slate` | `#8c8c8c` | Bordes de inputs, separadores suaves |
| `whisper-gray` | `#e5e5e0` | Fondo de inputs, bordes de tarjetas, estados desactivados |
| `pinterest-red` | `#8B1A1A` | CTAs primarios, branding, iconos de nav activos, botón QR |
| `highlight-yellow` | `#fffd92` | Fondo de elementos destacados (colección completada, ranking propio) |
| `idea-violet` | `#9270d7` | Reservado — no usar sin justificación |
| `discovery-blue` | `#2b48d4` | Reservado — no usar sin justificación |

### Gradientes de hero
```css
/* Sobre imagen — fade hacia el fondo de página */
background: linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 50%, #F5F2EE 100%)

/* Login / páginas con fondo crema */
background: linear-gradient(to bottom, transparent 30%, #F5F2EE 100%)
```

El color de fondo crema `#F5F2EE` se usa en páginas con hero (AuthPage, ProfilePage). El resto de páginas usan `bg-canvas-white`.

---

## 2. Tipografía

Fuente única: **Inter** (400, 500, 600, 700, 900). Letter-spacing negativo global: `-0.037em`.

| Clase Tailwind | Tamaño | Line-height | Letter-spacing | Uso |
|---|---|---|---|---|
| `text-body-sm` | 12px | 1.4 | -0.44px | Metadatos, timestamps, labels de nav, badges |
| `text-body` | 14px | 1.4 | -0.52px | Texto de cuerpo, descripciones cortas, botones secundarios |
| `text-body-lg` | 16px | 1.5 | -0.59px | Texto de formularios, inputs |
| `text-subheading` | 20px | 1.4 | -0.74px | Títulos de sección, nombres en tarjetas |
| `text-heading` | 32px | 1.2 | -1.18px | Títulos de página (Home, Feed) |
| `text-heading-lg` | 38px | 1.2 | -1.41px | Títulos de pantalla grande (Logros) |

### Pesos habituales por contexto
- **900 (Black)** → Nombre de la app, título de monumento en detalle (`font-black`)
- **700 (Bold)** → Títulos de página, nombres de usuario (`font-bold`)
- **600 (Semibold)** → Labels de stat, nombres en feed, botones primarios (`font-semibold`)
- **500 (Medium)** → Labels de nav, subtítulos (`font-medium`)
- **400 (Regular)** → Cuerpo de texto, descripciones

---

## 3. Espaciado y Bordes

Unidad base: **4px**. Todo el espaciado usa múltiplos de 4.

### Border radius habitual
| Contexto | Clase | Valor |
|---|---|---|
| Tarjetas de contenido | `rounded-3xl` | 20px |
| Inputs, botones secundarios | `rounded-2xl` | 16px |
| Botones principales (pill) | `rounded-full` | 999px |
| Badges, chips | `rounded-full` | 999px |
| Avatares | `rounded-full` | 999px |

### Padding interno de tarjetas
- Tarjeta estándar: `p-4` (16px)
- Tarjeta grande / empty state: `px-6 py-10`
- Sección de página: `px-5` lateral, `pt-8` o `pt-10` superior

---

## 4. Componentes

### 4.1 Botón primario (pill rojo)
```tsx
<button className="w-full rounded-full bg-pinterest-red text-canvas-white py-4 text-body font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-sm">
  Texto acción
</button>
```
- Siempre `rounded-full`, fondo `pinterest-red`, texto blanco
- Padding vertical `py-3` o `py-4`
- `active:scale-[0.98]` para feedback táctil

### 4.2 Botón secundario (outline pill)
```tsx
<button className="rounded-full border border-[#DDD8D0] bg-canvas-white text-graphite px-6 py-3 text-body font-medium">
  Acción secundaria
</button>
```

### 4.3 Botón ghost / texto
```tsx
<button className="text-pinterest-red font-semibold text-body">
  Acción →
</button>
```

### 4.4 Tarjeta de contenido
```tsx
<div className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 shadow-sm">
  {/* contenido */}
</div>
```
- Fondo `canvas-white`, borde `whisper-gray`, `rounded-3xl`
- `shadow-sm` solo en tarjetas sobre fondos blancos

### 4.5 Toggle de vista (Lista / Mapa)
```tsx
<div className="flex rounded-2xl bg-[#F0F0F0] p-1 w-full">
  <button className={`flex-1 rounded-xl px-4 py-2.5 text-body font-medium transition-all ${active ? "bg-jet-black text-canvas-white shadow-sm" : "text-ash-gray"}`}>
    Opción
  </button>
</div>
```

### 4.6 Tab selector (Colecciones / Ranking)
```tsx
<div className="flex rounded-2xl bg-whisper-gray p-1 w-fit">
  <button className={`rounded-xl px-4 py-1.5 text-body font-medium transition-colors ${active ? "bg-canvas-white text-jet-black shadow-sm" : "text-ash-gray"}`}>
    Tab
  </button>
</div>
```

### 4.7 Input de formulario (underline)
```tsx
<div className="flex items-center gap-3 border-b border-[#CCC8C2] pb-2">
  {/* icono SVG 18×18 */}
  <input className="flex-1 bg-transparent text-body text-graphite placeholder:text-[#BBB7B0] focus:outline-none" />
</div>
```
Solo en AuthPage. El resto de inputs usa `rounded-2xl bg-whisper-gray`.

### 4.8 Stat card (Perfil)
```tsx
<div className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center">
  <div className="flex justify-center mb-1">{/* icono SVG */}</div>
  <p className="text-heading font-bold text-jet-black">{valor}</p>
  <p className="text-body-sm text-ash-gray">{label}</p>
</div>
```

### 4.9 Empty state
```tsx
<div className="flex flex-col items-center pt-16 pb-8 px-6 text-center gap-3">
  <span className="text-5xl mb-1">{emoji}</span>
  <p className="text-body font-semibold text-graphite">{título}</p>
  <p className="text-body-sm text-ash-gray">{descripción}</p>
  <button className="mt-2 rounded-full bg-pinterest-red text-canvas-white px-6 py-2.5 text-body font-semibold">
    CTA
  </button>
</div>
```

### 4.10 Spinner de carga
```tsx
<div className="flex flex-col items-center pt-16 gap-3">
  <div className="w-8 h-8 rounded-full border-[3px] border-pinterest-red border-t-transparent animate-spin" />
  <p className="text-body-sm text-ash-gray">Mensaje de carga…</p>
</div>
```

### 4.11 Shimmer (esqueleto de imagen)
```tsx
<div className="absolute inset-0 bg-[#E8E3DC] overflow-hidden">
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
</div>
```

### 4.12 Modal / overlay
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-jet-black/60 backdrop-blur-sm px-6">
  <div className="bg-canvas-white rounded-3xl p-6 w-full max-w-sm">
    {/* contenido */}
  </div>
</div>
```

---

## 5. Patrones de Página

### 5.1 Página con hero + contenido scrollable
Usado en: `AuthPage`, `ProfilePage`, `MonumentDetailPage`

```
<main className="h-full overflow-y-auto pb-24 bg-[#F5F2EE]">
  {/* Hero */}
  <div className="relative h-52 shrink-0">
    <img className="w-full h-full object-cover" />
    <div {/* gradiente */} />
    <div {/* controles sobre el hero */} className="absolute top-0 left-0 right-0 flex justify-between px-4 pt-4 z-10" />
  </div>

  {/* Contenido — solapa ligeramente el hero */}
  <div className="-mt-6 px-5">
    {/* ... */}
  </div>
</main>
```

### 5.2 Página estándar con BottomNav
Usado en: `HomePage`, `FeedPage`, `CollectionsPage`

```
<main className="min-h-full flex flex-col pb-24 bg-canvas-white">
  <header className="px-5 pt-10 pb-4">
    <h1 className="text-heading font-bold text-jet-black">Título</h1>
  </header>
  {/* contenido */}
  <BottomNav />
</main>
```

### 5.3 Pantalla de detalle (sin BottomNav, botón fijo inferior)
Usado en: `MonumentDetailPage`, `ScanPage`

```
<main className="min-h-full bg-canvas-white pb-28">
  {/* hero + contenido */}
  
  {/* CTA fijo */}
  <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-3 bg-canvas-white/95 backdrop-blur">
    <button className="w-full rounded-2xl bg-[#8B1A1A] text-canvas-white px-6 py-4">
      Acción principal
    </button>
  </div>
</main>
```

---

## 6. Navegación

### Bottom Navigation
5 ítems: **Inicio · Feed · QR (central) · Logros · Perfil**

- Ítems laterales: icono SVG 22×22 + label 11px
- Color activo: `#C0392B` (tono oscuro del pinterest-red del token)
- Color inactivo: `#9E9E9E`
- Botón QR central: `w-14 h-14 rounded-full bg-pinterest-red -mt-6 border-4 border-canvas-white shadow-lg`
- Borde superior: `border-t border-whisper-gray`

### Header de detalle (sobre hero)
```tsx
/* Volver */
<button className="flex items-center gap-1 text-canvas-white text-body-sm font-medium drop-shadow">
  ← Volver
</button>

/* Acción secundaria */
<button className="rounded-full border border-canvas-white/80 bg-canvas-white/10 backdrop-blur-sm text-canvas-white px-4 py-1.5 text-body-sm font-medium">
  Cerrar sesión
</button>
```

---

## 7. Iconos

Todos los iconos son **SVG inline**, sin dependencias externas.

- Tamaño estándar en UI: `18×18` o `20×20`
- Tamaño en stat cards / secciones: `22×22`
- Stroke: `1.2`–`1.6px`, `strokeLinecap="round"`, `strokeLinejoin="round"`
- Fill: `none` por defecto; `fill="currentColor"` o relleno explícito para iconos sólidos
- Color inactivo: `#9E9E9E`
- Color activo / acento: `currentColor` o `pinterest-red`

---

## 8. Avatares

Componente `<AvatarImage>` en `src/components/AvatarPicker.tsx`.

| Size prop | Clases | Uso |
|---|---|---|
| `sm` | `w-8 h-8` | Header de Home, listas de feed |
| `md` | `w-10 h-10` | Tarjetas de feed, resultados de búsqueda |
| `lg` | `w-16 h-16` | Perfil de usuario ajeno |
| `xl` | `w-20 h-20` | Perfil propio con hero |

Siempre `rounded-full`, fondo `bg-whisper-gray`, fallback emoji si falla la imagen.

En ProfilePage, el avatar XL lleva:
```tsx
<div className="rounded-full ring-4 ring-[#F5F2EE] shadow-md">
  <AvatarImage size="xl" />
</div>
```

---

## 9. Imágenes de Monumentos

Almacenadas en Supabase Storage (`monument-images/`). URL pública: `https://<project-ref>.supabase.co/storage/v1/object/public/monument-images/{slug}.jpg`

- Compresión: JPEG 82%, resolución máxima 1200px
- En lista: `w-36` fijo, `h-[148px]` fijo, `object-cover`
- En hero de detalle: `height: 52vh`, `min-height: 280px`, `object-cover`
- Shimmer animado mientras carga; fallback icono columnas si error

---

## 10. Estados de Carga y Error

| Estado | Patrón visual |
|---|---|
| Cargando datos | Spinner rojo `animate-spin` + texto "Cargando…" |
| Sin conexión / error fetch | Emoji 📡 + título + "Reintentar" (botón outline) |
| GPS buscando | Spinner gris + "Buscando monumentos cerca de ti…" |
| GPS denegado | Emoji 📍 + instrucciones + botón "Ver en el mapa" |
| Sin resultados | Emoji temático + título + descripción + CTA rojo |
| Perfil privado | Emoji 🔒 + "Perfil privado" + "← Volver" |
| No encontrado | Texto centrado + "← Volver" |

---

## 11. Reglas Generales

- **No usar sombras para elevación** — la profundidad se crea con cambios de color de fondo y espaciado. `shadow-sm` solo en tarjetas sobre fondo blanco.
- **No introducir nuevas fuentes** — Inter es la única.
- **Todas las esquinas son redondeadas** — mínimo `rounded-2xl` en elementos interactivos.
- **Feedback táctil** — `active:scale-[0.98]` o `active:scale-95` + `transition-transform` en todos los botones.
- **Sin gradientes decorativos** — solo gradientes funcionales en overlays de hero.
- **SVGs inline** para todos los iconos — sin emoji en iconos de interfaz (solo en empty states y badges).
- **`overflow-hidden` en imágenes** — siempre contenidas en un `div` con `rounded-*` + `overflow-hidden`.
- **Scroll** — `overflow-y-auto` en el contenedor de página, nunca en el `body`.
