# Decisiones de diseño

## AR: estilo "ventana al pasado"

Cuando el usuario apunta el móvil al monumento, la app reproduce un vídeo histórico **anclado a la fachada** ocupando el plano del edificio, con el resto del entorno real visible alrededor. No es pantalla completa (rompe la magia) ni reconstrucción 3D (coste prohibitivo).

### Decisión de viewpoint (MVP)

El vídeo se genera con Seedance 2.0 (u otro generador IA) → es **vídeo plano 2D desde un viewpoint fijo**. En AR esto crea una tensión: si el usuario se mueve respecto al ángulo desde el que se generó el vídeo, hay un ligero desalineamiento de perspectiva.

**Decisión MVP: aceptamos el desalineamiento.** El vídeo se reproduce como un plano anclado a la fachada y permitimos que el usuario se mueva libremente. La mayoría de usuarios no notarán la imperfección si el contenido es atractivo.

Implicaciones:
- **La marca física en el suelo deja de ser requisito técnico**. Se mantiene como **guía recomendada** ("colócate aquí para mejor experiencia") pero la app no exige que el usuario esté en ella.
- **Generación con Seedance**: prompt incluye "vista frontal del monumento, cámara fija a altura humana, ~15m de distancia" para que el viewpoint del vídeo se acerque al de un peatón típico mirando al edificio.
- **Foto de referencia (image tracking)**: tomada desde una posición frontal "media" representativa, no necesariamente idéntica al viewpoint del vídeo.
- **Plan B futuro** (post-MVP): si el desalineamiento resulta molesto, se puede explorar un "marco/portal estilizado" que justifique visualmente el carácter 2D del vídeo, o pasar a 3D Gaussian Splatting cuando madure.

### Implementación en WebAR (MindAR + Three.js)

- **Image tracking** vía MindAR: la foto de referencia se compila a `.mind` con `mindar-image-cli` y se sube a Supabase Storage.
- Al detectar la imagen, un `Mesh` con `PlaneGeometry` (16:9) y `VideoTexture` reproduce el vídeo anclado al `anchor` de MindAR.
- Audio: `<audio>` HTML5 sincronizado con `play/pause` del vídeo. En iOS Safari el primer `play()` debe ocurrir tras un gesto del usuario o con `muted=true`.
- Hosting con HTTPS obligatorio (Safari iOS exige HTTPS para `getUserMedia`).

## Verificación de visita (anti-trampas para medallas)

Doble verificación:
1. **GPS**: usuario está dentro de `RADIUS_METERS = 75` del monumento (ajustable por monumento si hace falta).
2. **Image tracking**: la cámara ha reconocido la fachada (no vale poner una foto en la pantalla).

Ambas se validan **server-side** en la edge function `validate-visit` antes de marcar `verified_geo` y `verified_image`. El trigger SQL `grant_eligible_medals` otorga medallas solo cuando ambas son `true` para todos los monumentos requeridos.

## UX

### Flujo principal
1. Mapa con monumentos cercanos (consulta PostGIS `monuments_nearby`).
2. Tap en monumento → ficha + botón "Activar AR".
3. Pantalla AR con instrucciones: "Apunta la cámara al monumento".
4. Detección → vídeo + audio.
5. Al terminar → "¡Visita registrada!" + medalla(s) ganada(s) si las hay.

### Modo invitado vs cuenta
- **Invitado**: puede escanear QR + ver la AR sin login. Cero fricción para turistas de paso.
- **Cuenta**: necesaria para guardar visitas, ganar medallas, seguir gente, recibir push.

### Social
- **Feed** (eventos de seguidos): "X visitó Y", "X ganó la medalla Z".
- **Perfil propio**: medallas, colecciones, mapa de visitados, contadores de seguidores.
- **Perfil público**: opt-in (privado por defecto). Solo perfiles públicos pueden ser seguidos.
- **Buscar gente**: por nombre/handle.
- **Push**: cuando alguien que sigues hace algo destacable (medalla, colección completa).

### Onboarding en la calle
- Marca física en el suelo con QR → URL de la PWA. Cero fricción (no hay que pasar por App Store).
- Si el usuario engancha → smart app banner / prompt para instalar la app nativa.
- La marca **guía la posición ideal** pero no es requisito técnico.

## Privacidad / GDPR

- Ubicación: solicitada solo cuando el usuario abre la cámara AR. No se almacena el track del usuario, solo la coordenada del momento de la visita.
- Cuenta: opcional para el modo libre; obligatoria para acumular medallas.
- Política de privacidad publicada antes del primer beta cerrado.

## Generación de contenido (Fase 3)

Pipeline:
1. Input: `(nombre, coordenadas, foto frontal, fuentes Wikipedia/UNESCO)`.
2. Claude/GPT genera guion histórico de 90–120s, citando fuentes. Prompt obliga a marcar como `[INCIERTO]` cualquier dato no verificable.
3. ElevenLabs genera narración (voz por defecto en español; multi-idioma a partir del mismo guion traducido).
4. Seedance/Veo3/Sora genera vídeo a partir del guion + foto de referencia + prompts visuales por período histórico.
5. **Revisión editorial humana** antes de publicar (`monuments.published = true`).

## Decisiones pendientes

- Nombre comercial de la app.
- Hosting de la PWA: Vercel vs Netlify vs Cloudflare Pages (las tres gratis para hobby).
- Cómo manejar monumentos en interiores (museos) — image tracking funciona, pero GPS es poco fiable. Dejado para fase posterior.
- Pasarela de pago para medallas premium en PWA: Stripe Checkout (más simple que IAPs nativos, sin comisión Apple del 30%).
- Si en algún momento el producto necesita push notifications iOS más potentes o features nativas, evaluar migración a app nativa con WebView + bridge a Supabase (Capacitor) en lugar de reescribir.
