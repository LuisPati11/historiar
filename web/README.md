# HistoriAR — Cliente

Cliente único: **PWA (web) + app nativa iOS/Android vía Capacitor**, misma base de código.

## Stack

- **Vite + React + TypeScript** — base del proyecto.
- **MindAR** + **Three.js** — image tracking + renderizado del vídeo plano sobre la fachada.
- **Tailwind CSS** — UI.
- **i18next** + `react-i18next` — i18n (es + en).
- **Supabase JS** — auth, datos, RPCs PostGIS, edge functions.
- **vite-plugin-pwa** — instalabilidad PWA y caché del shell y targets `.mind`.
- **Capacitor** — wrapper nativo para iOS y Android (icono home, push notifications, App Store).

## Setup

Requisitos: Node.js 22 o posterior y pnpm 11. El proyecto retiene durante 24 horas las versiones recién publicadas y sólo permite ejecutar el script de instalación de `esbuild`.

```bash
cd web
pnpm install
cp .env.example .env   # rellenar con la URL y anon key de tu proyecto Supabase
pnpm dev
```

## Prueba con Supabase local

Con Docker en ejecución, arranca el backend desde la raíz del repositorio:

```bash
cd backend
supabase start
supabase functions serve
```

En `web/.env.development.local`, configura `VITE_SUPABASE_URL` con la API URL local y `VITE_SUPABASE_ANON_KEY` con la anon key que muestra `supabase status`. Este archivo se ignora en Git y sólo afecta al servidor de desarrollo; no cambia la configuración de `pnpm build`.

En otra terminal, ejecuta `cd web && pnpm dev` desde la raíz. Abre `http://127.0.0.1:5173/`. Puedes recorrer el catálogo como invitado, cambiar de idioma y registrar una cuenta de prueba. Los correos de confirmación se reciben en el buzón local `http://127.0.0.1:54324/`.

El seed permite probar la interfaz, pero la experiencia AR completa necesita cargar los archivos `.mind`, vídeo y audio del monumento.

## Cómo probar en el iPhone

`getUserMedia` (cámara) y `geolocation` requieren **HTTPS** en iOS Safari. Opciones para desarrollo:

1. **ngrok**: `ngrok http 5173` → URL HTTPS pública que puedes abrir en el iPhone.
2. **Cloudflare Tunnel** (`cloudflared tunnel`).
3. **Vercel preview deploy**: `vercel` → URL HTTPS automática.

Una vez con HTTPS, abre la URL en Safari del iPhone, da permiso a cámara y ubicación.

El backend también debe ser accesible desde el teléfono: `127.0.0.1` apunta al propio iPhone, no al Mac. Para estas pruebas, usa un proyecto Supabase remoto operativo, con migraciones y la función `validate-visit` desplegadas. Si preparaste `.env.development.local`, actualiza sus valores para esa prueba: tienen prioridad sobre `.env` al ejecutar `pnpm dev`. Exponer sólo Vite mediante un túnel no hace accesible Supabase local.

## Image targets (.mind)

MindAR no usa la imagen JPG directamente: hay que compilarla a un formato `.mind` propietario:

Usa el [compilador oficial online de MindAR](https://hiukim.github.io/mind-ar-js-doc/tools/compile). El paquete npm `mindar-image-cli` no existe como CLI publicable; compilar localmente exige construir el repositorio de MindAR y sus dependencias nativas.

El `.mind` resultante se sube al bucket `mind-targets` de **Supabase Storage** y la URL se guarda en `monuments.mind_target_url`. `reference_image_url` se reserva para la imagen JPG/WEBP del bucket `monument-images` que se muestra en la interfaz. Vídeo y audio usan `monument-video` y `monument-audio`; sus límites y MIME están versionados por migración.

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
│   ├── supabase.ts    Fachada pública del acceso a datos
│   ├── supabaseClient.ts
│   └── api/           Monumentos, visitas, perfil, social y logros
└── index.css          Tailwind
```

## Capacitor (app nativa)

Capacitor envuelve esta misma PWA en una app iOS y Android nativa. La PWA sigue funcionando en web — son dos canales de distribución de la misma base de código.

Capacitor 8 requiere Node.js 22+, iOS 15+/Xcode 26 y Android SDK 36. Verifica el entorno con `pnpm exec cap doctor` antes de añadir o sincronizar plataformas.

```bash
# Una sola vez, tras pnpm install
pnpm exec cap add ios
pnpm exec cap add android

# Ciclo de desarrollo
pnpm cap:sync          # build + sync
pnpm cap:ios           # abre Xcode
pnpm cap:android       # abre Android Studio
```

Apple Developer Program ($99/año) solo es necesario para subir a TestFlight / App Store. Para probar en tu propio iPhone vale tu Apple ID gratis con sigining ad-hoc.

## Próximos pasos

1. `pnpm install` para resolver dependencias.
2. Crear proyecto Supabase y copiar URL + publishable/anon key a `.env`. Verificar que el hostname resuelve antes del despliegue.
3. Aplicar migraciones del directorio `../backend/supabase/migrations/`.
4. Compilar imagen de referencia de la Puerta de Toledo a `.mind` y subir a Storage.
5. Subir un vídeo de prueba a `monument-video` y un audio a `monument-audio`.
6. Actualizar `monuments` en BBDD con las URLs de Storage.
7. `pnpm dev` + ngrok + abrir en iPhone físicamente cerca de la Puerta de Toledo.
8. (Después) `pnpm exec cap add ios` + Xcode para empaquetar la app nativa.

Antes de publicar, completa la lista de [seguridad y despliegue](../docs/security.md).
