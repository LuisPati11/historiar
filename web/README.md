# HistoriAR — Cliente

Cliente único: **PWA (web) + app nativa iOS/Android vía Capacitor**, misma base de código.

## Stack

- **Vite + React + TypeScript** — base del proyecto.
- **MindAR** + **Three.js** — image tracking + renderizado del vídeo plano sobre la fachada.
- **Tailwind CSS** — UI.
- **i18next** + `react-i18next` — i18n (es + en).
- **Supabase JS** — auth, datos, RPCs PostGIS, edge functions.
- **vite-plugin-pwa** — instalabilidad PWA + caché offline de vídeos/audios.
- **Capacitor** — wrapper nativo para iOS y Android (icono home, push notifications, App Store).

## Setup

```bash
cd web
pnpm install
cp .env.example .env   # rellenar con la URL y anon key de tu proyecto Supabase
pnpm dev
```

## Cómo probar en el iPhone

`getUserMedia` (cámara) y `geolocation` requieren **HTTPS** en iOS Safari. Opciones para desarrollo:

1. **ngrok**: `ngrok http 5173` → URL HTTPS pública que puedes abrir en el iPhone.
2. **Cloudflare Tunnel** (`cloudflared tunnel`).
3. **Vercel preview deploy**: `vercel` → URL HTTPS automática.

Una vez con HTTPS, abre la URL en Safari del iPhone, da permiso a cámara y ubicación.

## Image targets (.mind)

MindAR no usa la imagen JPG directamente: hay que compilarla a un formato `.mind` propietario:

```bash
npx mindar-image-cli@latest compile -i puerta-toledo-ref.jpg -o puerta-toledo.mind
```

El `.mind` resultante se sube a **Supabase Storage** y la URL se guarda en `monuments.reference_image_url`.

Tip: una sola imagen frontal en buena luz suele bastar para empezar. Si el tracking falla en condiciones reales, compilar varias imágenes en el mismo `.mind` (varios ángulos, distintas horas).

## Estructura

```
src/
├── main.tsx           Entry point, router
├── pages/
│   ├── HomePage.tsx   Mapa de monumentos cercanos
│   └── ARPage.tsx     Pantalla AR (cámara + tracking + vídeo)
├── ar/
│   └── mindar.ts      Wrapper de MindAR + Three.js
├── lib/
│   └── supabase.ts    Cliente Supabase + helpers
└── index.css          Tailwind
```

## Capacitor (app nativa)

Capacitor envuelve esta misma PWA en una app iOS y Android nativa. La PWA sigue funcionando en web — son dos canales de distribución de la misma base de código.

```bash
# Una sola vez, tras pnpm install
npx cap add ios
npx cap add android

# Ciclo de desarrollo
pnpm cap:sync          # build + sync
pnpm cap:ios           # abre Xcode
pnpm cap:android       # abre Android Studio
```

Apple Developer Program ($99/año) solo es necesario para subir a TestFlight / App Store. Para probar en tu propio iPhone vale tu Apple ID gratis con sigining ad-hoc.

## Próximos pasos

1. `pnpm install` para resolver dependencias.
2. Crear proyecto Supabase y copiar URL + anon key a `.env`.
3. Aplicar migraciones del directorio `../backend/supabase/migrations/`.
4. Compilar imagen de referencia de la Puerta de Toledo a `.mind` y subir a Storage.
5. Subir un vídeo de prueba (incluso un MP4 cualquiera) y un audio a Storage.
6. Actualizar `monuments` en BBDD con las URLs de Storage.
7. `pnpm dev` + ngrok + abrir en iPhone físicamente cerca de la Puerta de Toledo.
8. (Después) `npx cap add ios` + Xcode para empaquetar la app nativa.
