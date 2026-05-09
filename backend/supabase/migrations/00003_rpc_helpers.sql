-- RPC helpers consumidos desde edge functions y desde la app.

-- ¿Está (lat,lng) dentro del radio (m) del monumento?
create or replace function public.monument_within(
  p_monument_id uuid,
  p_lat         double precision,
  p_lng         double precision,
  p_radius_m    int
)
returns boolean
language sql
stable
as $$
  select ST_DWithin(
    m.location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radius_m
  )
  from public.monuments m
  where m.id = p_monument_id;
$$;

-- Monumentos cercanos al usuario (publicados), opcionalmente filtrando los no visitados.
create or replace function public.monuments_nearby(
  p_lat            double precision,
  p_lng            double precision,
  p_radius_m       int default 1000,
  p_only_unvisited bool default false
)
returns table (
  id uuid,
  name text,
  city text,
  country text,
  distance_m double precision,
  reference_image_url text
)
language sql
stable
as $$
  select
    m.id, m.name, m.city, m.country,
    ST_Distance(m.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) as distance_m,
    m.reference_image_url
  from public.monuments m
  where m.published
    and ST_DWithin(m.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
    and (
      not p_only_unvisited
      or not exists (
        select 1 from public.visits v
        where v.monument_id = m.id and v.user_id = auth.uid()
      )
    )
  order by distance_m;
$$;
