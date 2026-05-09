# CLAUDE.md

Contexto del proyecto para Claude. Léelo antes de trabajar en este repo.

## Qué es HistoriAR

App de guía turística con AR y gamificación social. El usuario apunta el móvil a un monumento y ve un vídeo histórico anclado a la fachada con audio narrado. Gana medallas individuales y completa colecciones (ej. *Medalla Culiparda* = 10 monumentos de Ciudad Real). Sigue a otros usuarios, ve sus visitas y trofeos en un feed social.

- **MVP**: Puerta de Toledo, Ciudad Real, en español + inglés.
- **Visión**: cualquier monumento del mundo.
- **Estado**: greenfield, scaffolding y schema escritos pero sin probar end-to-end.

## Stack y decisiones cerradas

| Decisión | Valor |
|---|---|
| Cliente | PWA (Vite + React + TS + Tailwind) envuelta en **Capacitor** para iOS + Android |
| AR | **MindAR** (image tracking, open source) + Three.js. Vídeo 2D plano sobre la fachada. |
| Estilo AR | Vídeo plano. Aceptamos desalineamiento si el usuario se mueve. La marca física en el suelo es **guía**, no requisito. |
| Backend | **Supabase** (Postgres + PostGIS + Auth + Storage + Edge Functions). Descartado Firebase. |
| i18n | i18next + tablas `*_translations` en BBDD para contenido. ES + EN desde día 1. |
| Auth gating | AR libre para invitados; cuenta solo necesaria para guardar visitas, medallas y social. |
| Privacidad | Perfiles **privados por defecto**, opt-in a público. |
| Verificación de visita | Doble check server-side: GPS (radio 75m) + image tracking. Solo si ambas → medalla. |
| Push notifications | Capacitor Push Notifications → APNs + FCM (Fase 2). |
| Monetización | Stripe Checkout (no IAPs nativos para evitar comisión 30% Apple). Fase 4. |
| Hosting web | Vercel. |
| Distribución app | TestFlight + App Store + Play Store (Fase 4). |
| Plan completo | `~/.claude/plans/c-mo-ver-as-de-posible-optimized-tiger.md` |

### Stacks/servicios descartados (no proponer sin razón nueva)

- **Unity / AR Foundation**: descartado tras decidir que aceptamos vídeo 2D plano. Sin requisito de anclaje 3D preciso, MindAR cubre el caso con cero curva de aprendizaje y cero fricción de instalación.
- **Firebase**: descartado a favor de Supabase por PostGIS (queries geoespaciales) y modelo relacional natural para medallas/colecciones.
- **App nativa pura (SwiftUI / Kotlin)**: descartada por duplicar trabajo siendo solo dev.
- **Flutter / React Native**: descartados por inmadurez de plugins AR.
- **WebAR sola (sin app nativa)**: descartado tras añadir requisito de social + push notifications.

## Estructura del repo

```
web/                                PWA + base de la app nativa
├── src/
│   ├── pages/HomePage.tsx          Lista de monumentos cercanos (PostGIS)
│   ├── pages/ARPage.tsx            Pantalla AR: cámara + tracking + vídeo
│   ├── ar/mindar.ts                Wrapper MindAR + Three.js
│   ├── lib/supabase.ts             Cliente Supabase + helpers (RPC, follows, feed)
│   ├── lib/i18n.ts                 Setup i18next
│   └── lib/locales/{es,en}.json    UI translations
├── capacitor.config.json           Config Capacitor (appId: app.historiar)
├── vite.config.ts                  Vite + PWA + caché de vídeos
├── package.json
└── README.md

backend/supabase/
├── migrations/
│   ├── 00001_initial_schema.sql    profiles, monuments+PostGIS, visits, medals, collections, trigger grant_eligible_medals
│   ├── 00002_rls_policies.sql      Row Level Security para todo
│   ├── 00003_rpc_helpers.sql       monument_within(), monuments_nearby()
│   └── 00004_social_and_i18n.sql   follows, feed_events, *_translations, feed_for_me(), triggers de feed
├── functions/validate-visit/       Edge Function: valida GPS server-side
└── seed.sql                        Puerta de Toledo + medalla + colección + traducciones EN

content-pipeline/                   Fase 3, no implementado
docs/
├── design.md                       Decisiones de UX, AR, privacidad, contenido
├── design-system/                  Tokens visuales (Pinterest base) — leer antes de tocar UI
│   ├── README.md                   Guía de uso + decisiones pendientes (v3 vs v4, Pin Sans)
│   ├── STYLE_GUIDE.md              Roles de cada token + do's/don'ts + componentes
│   ├── tokens.json                 W3C Design Tokens canónico
│   ├── variables.css               CSS custom properties (Tailwind v3 + vars)
│   └── theme.css                   Sintaxis @theme de Tailwind v4
└── monuments-roadmap.md            Lista de monumentos por fase
```

## Modelo de datos (resumen)

- `profiles`: extiende `auth.users`. Campos clave: `is_public`, `bio`, `locale`, `total_points`.
- `monuments`: PostGIS `geography(Point, 4326)`. Índice GIST + GIN sobre tags. `published bool`.
- `monument_periods`: 1 monumento → N períodos históricos.
- `visits`: 1 user × 1 monumento → 1 visita. Campos `verified_geo`, `verified_image`.
- `medals`, `medal_collections`, `collection_medals` (N:M), `medal_requirements` (N:M con monuments), `user_medals`.
- `follows`: N:M sobre profiles, con check `follower_id <> followed_id`.
- `feed_events`: tipos `visit | medal_earned | collection_completed`. Generados por triggers.
- `monument_translations`, `medal_translations`, `collection_translations`: PK compuesta `(id, locale)`.

## RPCs / Edge Functions importantes

- `monument_within(monument_id, lat, lng, radius_m)` → bool. Usa PostGIS `ST_DWithin`.
- `monuments_nearby(lat, lng, radius_m, only_unvisited)` → tabla. Búsqueda geoespacial.
- `feed_for_me(limit)` → tabla. Eventos del usuario + de sus seguidos públicos.
- Edge Function `validate-visit`: recibe `{monument_id, lat, lng, image_tracked}`. Valida geo server-side. Hace upsert en `visits`. El trigger `grant_eligible_medals` otorga medallas. El trigger `feed_event_after_visit` inserta en feed.

## Convenciones de código

- TypeScript estricto en frontend. SQL declarativo, RLS en su propia migración.
- UI en React funcional con hooks, sin Redux. Estado simple con `useState` / `useEffect`. Si crece, valorar Zustand (no Redux).
- Estilado **solo con Tailwind v4**. Plugin `@tailwindcss/vite` en `vite.config.ts` (sin `tailwind.config.js`, sin `postcss.config.js`).
- **Design system**: tokens en `docs/design-system/` (Pinterest "Bright Workshop Canvas" como base) + bloque `@theme` en `web/src/index.css`. Light theme por defecto; **`.theme-ar` en `<html>`** activa dark overlay para `ARPage`. Tipografía: Inter (sustitución de Pin Sans) cargada desde Google Fonts en `index.html`. **Antes de diseñar UI nueva, leer `docs/design-system/STYLE_GUIDE.md` y `docs/design-system/README.md`.**
- Utility classes generadas por los tokens: `bg-pinterest-red`, `text-graphite`, `text-body-lg`, `rounded-3xl` (20px), etc.
- Idiomas: **toda UI** vía i18next con `t()`. Contenido (nombre de monumento, descripción) viene de tablas `*_translations`.
- Migraciones SQL: numeradas `NNNNN_descripcion.sql`. Nunca editar una migración aplicada — crear la siguiente.
- Comentarios en código: por defecto ninguno; solo cuando el *por qué* no es obvio.

## Trabajar con AR (MindAR)

- Las imágenes de referencia NO son JPGs: se compilan a `.mind` con el compilador online (`https://hiukim.github.io/mind-ar-js-doc/tools/compile`) y se suben a Supabase Storage. El paquete npm `mindar-image-cli` no existe; el local solo se construye dentro del repo de mind-ar y arrastra `canvas` (Cairo/Pango).
- MindAR se importa vía `mind-ar/dist/mindar-image-three.prod.js`. **`pnpm.onlyBuiltDependencies: ["esbuild"]`** en `package.json` evita que `canvas` (dep transitiva, nativa) se intente compilar al instalar.
- **Three.js está pinneado a `0.157.0`** (con `@types/three` `0.157.0`). Versiones >=0.158 rompen MindAR 1.2.5 (eliminan `outputEncoding`); >=0.162 además quitan `sRGBEncoding`. No actualizar three sin verificar mindar nuevo.
- **React StrictMode está desactivado** en `src/main.tsx`. MindAR toma control exclusivo de la cámara y un WebGLRenderer; el doble-mount de StrictMode deja dos instancias compitiendo y la pantalla aparece en negro. Reactivar solo si añadimos un patrón de cleanup que tolere el doble effect.
- iOS Safari / WKWebView (Capacitor) exigen **HTTPS** para `getUserMedia`. En dev, usar ngrok / Cloudflare Tunnel / Vercel preview.
- El primer `play()` de un `<video>`/`<audio>` con sonido en iOS necesita gesto del usuario; arrancar `muted=true` y desmutear tras el tap "Iniciar experiencia" si hace falta.
- MindAR se monta sobre Three.js. El plano del vídeo se añade al `anchor.group` del MindAR.

## Trabajar con Supabase

- Cliente local: `cd backend && supabase link --project-ref <ref>` y `supabase db push` para aplicar migraciones.
- Antes de añadir lógica al cliente, comprobar si una RPC en SQL hace el trabajo más limpio (ej: filtros geoespaciales).
- RLS está activo en todas las tablas con datos sensibles. Si una operación falla con permission denied, lo más probable es que falte una policy, no un bug del cliente.
- La edge function `validate-visit` usa **service-role key** para escribir saltándose RLS — mantener esa lógica server-side, nunca exponer la service-role al frontend.

## Trabajar con Capacitor

- Gestor de paquetes: **pnpm** (no npm). `pnpm cap:sync` rebuild + sync. `pnpm cap:ios` abre Xcode. `pnpm cap:android` abre Android Studio.
- Añadir plataformas (una vez): `npx cap add ios`, `npx cap add android`.
- Plugins ya en `package.json`: `@capacitor/{app,geolocation,push-notifications,splash-screen,status-bar}`.
- Apple Developer Program ($99/año) requerido solo cuando se vaya a TestFlight/App Store, no para builds de desarrollo en device propio.

## Estado actual y qué hay que hacer

### Hecho (escrito, sin probar end-to-end)
- Scaffolding completo de `web/` con i18n.
- Migraciones SQL 00001–00004 incluyendo social y traducciones.
- Edge function `validate-visit` con verificación geo PostGIS.
- Seed con Puerta de Toledo en es+en.

### Por hacer (siguientes pasos físicos en orden)
1. `cd web && pnpm install` para resolver dependencias.
2. Crear proyecto en supabase.com, copiar URL + anon key a `web/.env`.
3. `cd backend && supabase link && supabase db push`. Cargar `seed.sql`.
4. Capturar foto frontal de la Puerta de Toledo con buena luz.
5. Compilar a `.mind` con `mindar-image-cli` y subir a Supabase Storage.
6. Generar / encontrar vídeo provisional (60–90s) y audio narrado en es+en (ElevenLabs).
7. Subir vídeo y audios a Storage. Actualizar `monuments` con las URLs.
8. `npm run dev` + ngrok → abrir en iPhone físicamente cerca del monumento → probar.
9. (Después) `npx cap add ios` + abrir Xcode + correr en device.

## Memoria persistente

Hay memoria de proyecto en `~/.claude/projects/-Users-luispatino-Desktop-pati-guide/memory/`. Antes de proponer cambios de stack, revisarla — muchas decisiones están grabadas con su *por qué*.
