-- Añade video_url, audio_url y built_year a monuments_nearby y monuments_all.
-- Requiere DROP + recrear porque cambia el tipo de retorno.

DROP FUNCTION IF EXISTS public.monuments_nearby(double precision, double precision, int, bool);
DROP FUNCTION IF EXISTS public.monuments_all();

CREATE FUNCTION public.monuments_nearby(
  p_lat            double precision,
  p_lng            double precision,
  p_radius_m       int default 1000,
  p_only_unvisited bool default false
)
RETURNS TABLE (
  id                  uuid,
  name                text,
  city                text,
  country             text,
  distance_m          double precision,
  reference_image_url text,
  video_url           text,
  audio_url           text,
  built_year          int,
  lat                 double precision,
  lng                 double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id,
    m.name,
    m.city,
    m.country,
    ST_Distance(m.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_m,
    m.reference_image_url,
    m.video_url,
    m.audio_url,
    (SELECT MIN(mp.year_from) FROM public.monument_periods mp WHERE mp.monument_id = m.id)::int AS built_year,
    ST_Y(m.location::geometry) AS lat,
    ST_X(m.location::geometry) AS lng
  FROM public.monuments m
  WHERE m.published
    AND ST_DWithin(m.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
    AND (
      NOT p_only_unvisited
      OR NOT EXISTS (
        SELECT 1 FROM public.visits v
        WHERE v.monument_id = m.id AND v.user_id = auth.uid()
      )
    )
  ORDER BY distance_m;
$$;

CREATE FUNCTION public.monuments_all()
RETURNS TABLE (
  id                  uuid,
  name                text,
  city                text,
  country             text,
  description         text,
  reference_image_url text,
  video_url           text,
  audio_url           text,
  built_year          int,
  lat                 double precision,
  lng                 double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id,
    m.name,
    m.city,
    m.country,
    m.description,
    m.reference_image_url,
    m.video_url,
    m.audio_url,
    (SELECT MIN(mp.year_from) FROM public.monument_periods mp WHERE mp.monument_id = m.id)::int AS built_year,
    ST_Y(m.location::geometry) AS lat,
    ST_X(m.location::geometry) AS lng
  FROM public.monuments m
  WHERE m.published
  ORDER BY m.name;
$$;
