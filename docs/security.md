# Seguridad y despliegue

## Controles implementados

- Perfiles privados por defecto; sólo el propietario o un perfil público es legible.
- Las filas de visitas no son públicas. Los perfiles públicos exponen únicamente el total agregado de visitas verificadas.
- El cliente no puede insertar, modificar ni borrar visitas. La Edge Function usa la clave de servicio y completa un reto de un solo uso con dos minutos de validez.
- GPS recalculado en servidor con PostGIS, radio de 75 m, tracking visual obligatorio, protección contra replay y límite de cinco intentos por diez minutos.
- Los flags de verificación son monotónicos, los eventos de feed no se duplican y las medallas se conceden de forma idempotente.
- Grants explícitos y mínimos en Data API; RPC personales no disponibles para `anon`.
- Las implementaciones `SECURITY DEFINER`, los retos efímeros y las funciones de triggers viven en `private`; el esquema `public` no contiene funciones con privilegios elevados.
- El grafo social público sólo muestra relaciones entre dos perfiles públicos. Las personas implicadas conservan acceso a sus propias relaciones sin revelar seguidores privados a terceros.
- CSP, HSTS, `nosniff`, política de referrer, permisos de navegador y bloqueo de framing configurados en Vercel y Netlify.
- Buckets editoriales públicos versionados con límites de tamaño/MIME y sin políticas de escritura para clientes.
- Dependencias con lockfile, espera mínima de 24 horas para nuevas versiones y scripts de instalación denegados salvo `esbuild`.
- La dependencia nativa `canvas` de las herramientas de compilación de MindAR se elimina del árbol web mediante override; no se usa para tracking y arrastraba una cadena vulnerable de empaquetado (`node-pre-gyp`/`tar`). `node-fetch@2.7.0` queda declarado explícitamente porque el bundle de MindAR lo importa sin declararlo como dependencia directa.
- La Edge Function fija sus dependencias en `deno.json`/`deno.lock` y tiene pruebas unitarias de payload más una prueba end-to-end local de Auth, JWT, PostGIS, reto, replay y persistencia.

## Límites conocidos

- La señal `image_tracked` nace en JavaScript. Un cliente modificado o una imagen reproducida en otra pantalla puede simularla; la PWA no ofrece attestation de dispositivo. El reto corto evita replay trivial, no fraude físico sofisticado.
- La migración de hardening mueve PostGIS fuera de `public` conservando las coordenadas y reconstruyendo las RPC. Si un entorno externo añadió otras columnas `geometry`/`geography` fuera de `monuments.location`, la migración aborta antes de tocar la extensión para exigir una revisión manual.
- La URL de Supabase configurada debe resolver y pertenecer al proyecto real antes de cualquier prueba end-to-end.

## Checklist antes de producción

1. Crear o confirmar el proyecto Supabase real, aplicar todas las migraciones y cargar el seed sólo en el entorno adecuado.
2. Configurar URLs de Site URL y Redirect URLs para producción, previews autorizadas y esquemas nativos; no usar comodines amplios.
3. Activar Cloudflare Turnstile o hCaptcha en Supabase Auth y registrar el widget en alta/recuperación. Esta tarea requiere claves reales y no se puede habilitar con valores inventados.
4. Mantener confirmación de correo, cambio seguro de contraseña y JWT obligatorio en `validate-visit`.
5. Guardar `SUPABASE_SERVICE_ROLE_KEY` sólo como secreto de la Edge Function. Nunca usarla en variables `VITE_*` ni en el cliente.
6. Verificar buckets: lectura pública sólo para contenido editorial publicado; escritura reservada a administradores/servicio.
7. Ejecutar `pnpm check`, `pnpm peers check`, `deno task check`, `supabase db reset --local`, `supabase test db`, `bash supabase/tests/edge_function_e2e.sh`, `supabase db advisors --local --level warn` y `supabase db lint --local`.
8. Ejecutar `pnpm audit --prod` y el escaneo OSV del lockfile; revisar cada hallazgo antes del release.
9. Probar CSP y permisos en la URL desplegada; confirmar cámara/GPS en Safari iOS y Chrome Android mediante HTTPS.
10. Publicar privacidad, retención/borrado de cuenta, contacto y base jurídica GDPR antes de la beta.

La revisión local del 4 de septiembre de 2026 consultó en OSV las 250 dependencias transitivas de producción resultantes y no encontró vulnerabilidades conocidas. `pnpm audit --prod` tampoco reportó vulnerabilidades. Ambos controles deben repetirse en CI o antes de cada release porque esta evidencia caduca.
