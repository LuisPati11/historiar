# Content pipeline (Fase 3)

Herramienta interna para generar guion + audio + vídeo de un monumento de forma semi-automática. **No es público para usuarios finales.**

## Pipeline

```
(nombre, coordenadas, foto frontal, fuentes)
        │
        ▼
[1] Claude/GPT genera guion histórico (90–120s)
    - prompt obliga a citar fuentes y marcar [INCIERTO] lo no verificable
        │
        ▼
[2] ElevenLabs TTS → narración multi-idioma
        │
        ▼
[3] Seedance / Veo3 / Sora → vídeo a partir del guion + foto + prompts visuales
        │
        ▼
[4] Revisión editorial humana (obligatoria antes de publicar)
        │
        ▼
[5] Subida a Supabase Storage + insert en `monuments` con published=false
        │
        ▼
[6] Editor revisa en app de admin → flip a published=true
```

## Stack tentativo

- Python 3.12 + uv
- `anthropic` SDK para Claude (con prompt caching para fuentes largas)
- `elevenlabs` SDK
- API de Seedance / Veo / Sora (la que tenga acceso disponible y mejor calidad para reconstrucción histórica)
- `supabase-py` para insertar resultado

## Pendiente

- Decidir qué generador de vídeo usar en Fase 3 según disponibilidad de API y resultados de pruebas.
- Diseñar interfaz de revisión editorial (web admin con preview de vídeo + edición manual de timestamps).
