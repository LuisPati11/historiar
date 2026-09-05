-- PostGIS 2.3+ is not relocatable. Preserve the only application geography
-- column, reinstall the extension outside the exposed API schema, then restore
-- the dependent RPC contracts.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where udt_name in ('geography', 'geometry')
      and table_schema not in ('pg_catalog', 'information_schema')
      and not (table_schema = 'public' and table_name = 'monuments' and column_name = 'location')
  ) then
    raise exception 'Unexpected PostGIS-dependent application columns exist; aborting relocation';
  end if;
end;
$$;

alter table public.monuments
  add column location_lat_backup double precision,
  add column location_lng_backup double precision;

update public.monuments
set location_lat_backup = public.st_y(location::public.geometry),
    location_lng_backup = public.st_x(location::public.geometry);

alter table public.monuments
  alter column location_lat_backup set not null,
  alter column location_lng_backup set not null;

drop function if exists public.monument_within(uuid, double precision, double precision, integer);
drop function if exists public.monuments_nearby(double precision, double precision, integer, boolean);
drop function if exists public.monuments_all();
drop function if exists public.get_monument_by_id(uuid);

drop extension postgis cascade;
create extension postgis with schema extensions;

alter table public.monuments
  add column location extensions.geography(Point, 4326);

update public.monuments
set location = extensions.st_setsrid(
  extensions.st_makepoint(location_lng_backup, location_lat_backup),
  4326
)::extensions.geography;

alter table public.monuments
  alter column location set not null,
  drop column location_lat_backup,
  drop column location_lng_backup;

create index monuments_location_idx on public.monuments using gist (location);

create function public.get_monument_by_id(p_id uuid)
returns table (
  id uuid,
  name text,
  city text,
  country text,
  description text,
  reference_image_url text,
  mind_target_url text,
  video_url text,
  audio_url text,
  built_year int,
  lat double precision,
  lng double precision
)
language sql
stable
set search_path = ''
as $$
  select
    m.id,
    m.name,
    m.city,
    m.country,
    m.description,
    m.reference_image_url,
    m.mind_target_url,
    m.video_url,
    m.audio_url,
    (select min(mp.year_from) from public.monument_periods mp where mp.monument_id = m.id)::int,
    extensions.st_y(m.location::extensions.geometry),
    extensions.st_x(m.location::extensions.geometry)
  from public.monuments m
  where m.id = p_id and m.published;
$$;

create function public.monuments_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 1000,
  p_only_unvisited bool default false
)
returns table (
  id uuid,
  name text,
  city text,
  country text,
  distance_m double precision,
  reference_image_url text,
  mind_target_url text,
  video_url text,
  audio_url text,
  built_year int,
  lat double precision,
  lng double precision
)
language sql
stable
set search_path = ''
as $$
  select
    m.id,
    m.name,
    m.city,
    m.country,
    extensions.st_distance(
      m.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    ),
    m.reference_image_url,
    m.mind_target_url,
    m.video_url,
    m.audio_url,
    (select min(mp.year_from) from public.monument_periods mp where mp.monument_id = m.id)::int,
    extensions.st_y(m.location::extensions.geometry),
    extensions.st_x(m.location::extensions.geometry)
  from public.monuments m
  where m.published
    and p_lat between -90 and 90
    and p_lng between -180 and 180
    and extensions.st_dwithin(
      m.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      least(greatest(coalesce(p_radius_m, 1000), 1), 50000)
    )
    and (
      not p_only_unvisited
      or not exists (
        select 1
        from public.visits v
        where v.monument_id = m.id
          and v.user_id = auth.uid()
          and v.verified_geo
          and v.verified_image
      )
    )
  order by extensions.st_distance(
    m.location,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
  );
$$;

create function public.monuments_all()
returns table (
  id uuid,
  name text,
  city text,
  country text,
  description text,
  reference_image_url text,
  mind_target_url text,
  video_url text,
  audio_url text,
  built_year int,
  lat double precision,
  lng double precision
)
language sql
stable
set search_path = ''
as $$
  select
    m.id,
    m.name,
    m.city,
    m.country,
    m.description,
    m.reference_image_url,
    m.mind_target_url,
    m.video_url,
    m.audio_url,
    (select min(mp.year_from) from public.monument_periods mp where mp.monument_id = m.id)::int,
    extensions.st_y(m.location::extensions.geometry),
    extensions.st_x(m.location::extensions.geometry)
  from public.monuments m
  where m.published
  order by m.name;
$$;

create function public.monument_within(
  p_monument_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 75
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.monuments m
    where m.id = p_monument_id
      and m.published
      and p_lat between -90 and 90
      and p_lng between -180 and 180
      and extensions.st_dwithin(
        m.location,
        extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
        least(greatest(coalesce(p_radius_m, 75), 1), 50000)
      )
  );
$$;

revoke all on function public.get_monument_by_id(uuid) from public, anon, authenticated;
revoke all on function public.monuments_nearby(double precision, double precision, integer, boolean) from public, anon, authenticated;
revoke all on function public.monuments_all() from public, anon, authenticated;
revoke all on function public.monument_within(uuid, double precision, double precision, integer) from public, anon, authenticated;

grant execute on function public.get_monument_by_id(uuid) to anon, authenticated;
grant execute on function public.monuments_nearby(double precision, double precision, integer, boolean) to anon, authenticated;
grant execute on function public.monuments_all() to anon, authenticated;
grant execute on function public.monument_within(uuid, double precision, double precision, integer) to anon, authenticated, service_role;
