# HistoriAR — Guia turistica con Realidad Aumentada y Gamificacion

> Apunta tu movil a un monumento historico y viaja en el tiempo.

**PWA:** [travel-guide-medals.netlify.app](https://travel-guide-medals.netlify.app)

---

## Que es HistoriAR

HistoriAR es una aplicacion web progresiva (PWA) que transforma la visita a monumentos historicos en una experiencia inmersiva y social. El usuario apunta la camara de su movil a la fachada de un monumento y ve un video historico anclado en realidad aumentada, con audio narrado, como si el edificio contara su propia historia.

Mas alla de la AR, HistoriAR funciona como un juego de exploracion: cada monumento visitado y verificado otorga una medalla, y completar rutas tematicas desbloquea colecciones de mayor valor. Los usuarios pueden seguirse entre si, comparar logros y ver en un feed social las aventuras de sus amigos exploradores.

**Dirigido a:** turistas culturales, familias, escolares en visitas didacticas, y cualquier persona curiosa por la historia de su entorno.

---

## Funcionalidades principales

### Descubrimiento de monumentos

- **Lista de monumentos cercanos** — Al abrir la app, el usuario ve automaticamente los monumentos mas proximos a su ubicacion (GPS), ordenados por distancia.
- **Vista de mapa** — Toggle a un mapa interactivo (MapLibre GL + MapTiler) con todos los monumentos de la provincia geolocalizados.

### Detalle de monumento

Cada monumento tiene su propia ficha con:

- Descripcion historica e imagenes.
- **Timeline de periodos historicos** — linea de tiempo visual con los distintos momentos relevantes del monumento.
- Distancia en tiempo real desde la posicion del usuario.
- Boton "Como llegar" que abre Google Maps con ruta a pie.
- Boton "Escanear QR" para iniciar la experiencia AR.

### Escanear QR

La app incluye un lector de QR nativo (sin apps externas). El usuario escanea el codigo fisico situado junto al monumento y la app navega directamente a la experiencia de realidad aumentada correspondiente.

### Experiencia AR

El nucleo del producto. La app activa la camara trasera, detecta la imagen de referencia del monumento mediante **image tracking** (MindAR) y superpone un video historico en 2D anclado a la fachada. El video va acompanado de audio narrado.

La visita queda verificada de forma automatica cuando se cumplen dos condiciones simultaneas:

1. El GPS confirma que el usuario esta a menos de 75 metros del monumento.
2. El image tracking detecta la fachada en tiempo real.

Solo con doble verificacion se otorga la medalla correspondiente.

### Sistema de medallas

Tres categorias de logro:

| Tipo | Color | Condicion |
|------|-------|-----------|
| Individual capital | Bronce | Visitar un monumento de la capital |
| Individual provincial | Plata | Visitar un monumento fuera de la capital |
| Coleccion completada | Oro | Completar todos los monumentos de una ruta tematica |

### Colecciones tematicas

Cuatro rutas agrupan los monumentos por tema o zona geografica:

- **Ciudad Real Historica** — los monumentos emblematicos de la capital.
- **Medalla Culiparda** — los 10 monumentos de Ciudad Real capital.
- **Ruta de Don Quijote** — monumentos ligados al universo cervantino.
- **Castillos de La Mancha** — fortalezas y castillos de la provincia.

### Ranking de exploradores

Tabla clasificatoria global con los usuarios ordenados por numero total de medallas obtenidas. Fomenta la competicion amistosa y la motivacion para seguir explorando.

### Feed social

Vista de actividad de los usuarios que el usuario sigue: visitas realizadas, medallas conseguidas y colecciones completadas. Cada evento muestra el avatar, nombre de usuario, accion y monumento correspondiente.

### Perfiles de usuario

- **Perfil propio** — estadisticas personales: numero de visitas, medallas, seguidores y usuarios seguidos. Grid visual de medallas obtenidas.
- **Perfil publico de otros usuarios** — visible para quien tenga perfil publico activado.
- **Privacidad por defecto** — los perfiles son privados al registrarse; el usuario elige hacerlos publicos.

### Seguir exploradores

Sistema de follows bidireccional. Desde el perfil de cualquier usuario publico se puede seguir o dejar de seguir. El feed social muestra solo la actividad de los usuarios seguidos.

### Busqueda de exploradores

Buscador de usuarios por nombre para descubrir y seguir a otros exploradores.

### Autenticacion

Registro e inicio de sesion con email. Al crear la cuenta, el usuario elige un **avatar** entre cinco personajes:

| Avatar | Nombre |
|--------|--------|
| Buho | Buho sabio |
| Zorro | Zorro explorador |
| Paloma | Paloma mensajera |
| Gato | Gato detective |
| Perro | Perro aventurero |

---

## Contenido actual — Ciudad Real

| Ambito | Cantidad |
|--------|----------|
| Monumentos en la capital | 15 |
| Monumentos provinciales | 6 |
| **Total monumentos** | **21** |
| Medallas individuales | 21 |
| Medallas de coleccion | 4 |
| **Total medallas** | **25** |

**Localidades con monumentos provinciales:** Almagro, Almodovar del Campo, Campo de Criptana, Consuegra, Calatrava la Nueva, Villanueva de los Infantes.

---

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | Vite + React + TypeScript + Tailwind CSS v4 |
| Realidad Aumentada | MindAR (image tracking) + Three.js |
| Mapa | MapLibre GL + MapTiler |
| Backend | Supabase (Postgres + PostGIS + Auth + Storage + Edge Functions) |
| Verificacion de visita | Edge Function con validacion GPS server-side (ST_DWithin) |
| Internacionalizacion | i18next (ES + EN desde el inicio) |
| Distribucion web | PWA en Vercel |
| App nativa (proxima fase) | Capacitor (iOS + Android) |

La arquitectura de verificacion de visita es **server-side**: el frontend nunca puede falsear una visita, ya que la validacion GPS la realiza una Edge Function con la service-role de Supabase, fuera del alcance del cliente.

---

## Roadmap

### Fase 1 — MVP (Ciudad Real) ✅ en curso
- 21 monumentos de Ciudad Real capital y provincia.
- Experiencia AR completa en la Puerta de Toledo.
- Sistema de medallas y colecciones.
- Feed social y perfiles.

### Fase 2 — Expansion regional
- Nuevas provincias de Castilla-La Mancha.
- Push notifications al acercarse a un monumento (geofencing).
- Mejoras en el onboarding y tutoriales AR.

### Fase 3 — Plataforma nacional
- Cualquier municipio o institucion puede incorporar sus monumentos.
- Panel de gestion de contenidos (video, audio, imagenes de referencia).
- Pipeline de produccion de contenido AR asistida por IA.

### Fase 4 — App nativa y monetizacion
- Publicacion en App Store (iOS) y Play Store (Android) via Capacitor.
- **Monetizacion B2B:** Stripe Checkout para municipios e instituciones que contraten la incorporacion de sus monumentos a la plataforma (sin comision del 30% de Apple al ser pago web).
- Soporte para guias de audio en varios idiomas adicionales.

---

## Privacidad y acceso

- La experiencia AR es **libre para usuarios no registrados** — cualquiera puede escanear y ver el video historico.
- La cuenta es necesaria unicamente para guardar visitas, acumular medallas y participar en el sistema social.
- Los perfiles son **privados por defecto**; el usuario decide si hacerlo publico.
- Cumplimiento RGPD: datos minimos (email + avatar elegido por el usuario).
