# HistoriAR (nombre provisional)

App de guía turística con realidad aumentada y gamificación social. Apuntas el móvil a un monumento y ves un vídeo histórico anclado a la fachada con audio narrado. Ganas medallas, completas colecciones, sigues a amigos y ves dónde han estado.

**MVP**: Puerta de Toledo, Ciudad Real (en español + inglés desde día 1).
**Visión**: cualquier monumento del mundo, con colecciones tipo *Medalla Culiparda* (10 monumentos de Ciudad Real), *7 Maravillas Premium*, etc.

## Stack

| Capa | Tecnología |
|---|---|
| Cliente | **PWA** Vite + React + TypeScript + Tailwind, envuelta en **Capacitor** para iOS + Android nativos |
| AR | **MindAR** (image tracking en navegador, open source) + Three.js |
| i18n | i18next (es + en) + tablas de traducción en BBDD para contenido |
| Backend | **Supabase** (Postgres + PostGIS + Auth + Storage + Edge Functions) |
| Push | Capacitor Push Notifications → APNs (iOS) + FCM (Android) |
| Pago | Stripe Checkout (medallas premium en Fase 4) |
| Generación de contenido | Claude/GPT (guion) + ElevenLabs (TTS multi-idioma) + Seedance/Veo/Sora (vídeo) |
| Hosting web | Vercel (HTTPS gratis) |

> **Decisión clave**: Capacitor envuelve la PWA en una app nativa real con icono de home, notificaciones push y App Store. Misma base de código sirve para web (PWA) y app instalable. Sin Unity, sin reescribir nada.

## Estructura

```
web/                 PWA + base de la app nativa (Vite + React + MindAR + Capacitor)
backend/supabase/    Schema SQL (5 migraciones) + edge functions + seed
content-pipeline/    Generación de contenido con IA (Fase 3)
docs/                Diseño y roadmap
```

## Fases

1. **Fase 1 – PoC WebAR** (~1–2 semanas): PWA con MindAR + 1 monumento + contenido manual + deploy HTTPS. Validar que la magia funciona en la calle.
2. **Fase 2 – Backend + medallas + social** (~3–5 semanas): Supabase + cuentas + medallas + follows + feed + push + 5–10 monumentos.
3. **Fase 3 – Pipeline IA** (~4–6 semanas): generación semi-automática de contenido (guion → TTS → vídeo) con revisión editorial humana.
4. **Fase 4 – App nativa + monetización**: build con Capacitor, App Store + Play Store, Stripe Checkout, freemium, crowdsourcing.

## Setup rápido

```bash
# Web
cd web
pnpm install
cp .env.example .env  # configurar URL y anon key de Supabase
pnpm dev

# Capacitor (cuando se quiera generar app nativa)
npx cap add ios
npx cap add android
pnpm cap:ios       # abre Xcode
pnpm cap:android   # abre Android Studio

# Supabase
brew install supabase/tap/supabase
cd backend
supabase link --project-ref <ref>
supabase db push      # aplica migraciones 00001–00004
psql $DATABASE_URL < supabase/seed.sql
```

Más detalle en `web/README.md` y `CLAUDE.md`.
