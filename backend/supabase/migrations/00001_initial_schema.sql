-- HistoriAR — schema inicial
-- Fase 2: usuarios, monumentos, visitas y medallas con PostGIS para geolocalización.

create extension if not exists postgis;

----------------------------------------------------------------------
-- Profiles (extiende auth.users)
----------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  total_points int not null default 0,
  created_at   timestamptz not null default now()
);

-- Sincroniza creación de profile cuando aparece un nuevo auth.user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

----------------------------------------------------------------------
-- Monuments (PostGIS para queries geoespaciales)
----------------------------------------------------------------------
create table public.monuments (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  city                text,
  country             text,
  location            geography(Point, 4326) not null,
  description         text,
  reference_image_url text,
  video_url           text,
  audio_url           text,
  script_url          text,
  tags                text[] default '{}',
  published           bool not null default false,
  created_at          timestamptz not null default now()
);

create index monuments_location_idx on public.monuments using gist (location);
create index monuments_tags_idx     on public.monuments using gin  (tags);

----------------------------------------------------------------------
-- Períodos históricos (1 monumento → N períodos en orden)
----------------------------------------------------------------------
create table public.monument_periods (
  id           uuid primary key default gen_random_uuid(),
  monument_id  uuid not null references public.monuments(id) on delete cascade,
  year_from    int,
  year_to      int,
  title        text not null,
  description  text,
  order_index  int not null default 0
);

create index monument_periods_monument_idx on public.monument_periods (monument_id, order_index);

----------------------------------------------------------------------
-- Visitas (1 user × 1 monumento → 1 visita)
----------------------------------------------------------------------
create table public.visits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  monument_id    uuid not null references public.monuments(id) on delete cascade,
  visited_at     timestamptz not null default now(),
  verified_geo   bool not null default false,
  verified_image bool not null default false,
  unique (user_id, monument_id)
);

create index visits_user_idx on public.visits (user_id);

----------------------------------------------------------------------
-- Medallas + colecciones + requisitos
----------------------------------------------------------------------
create table public.medals (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  image_url     text,
  tier          text not null check (tier in ('bronze','silver','gold','premium')),
  points_reward int not null default 0,
  created_at    timestamptz not null default now()
);

create table public.medal_collections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  image_url   text,
  is_premium  bool not null default false,
  created_at  timestamptz not null default now()
);

create table public.collection_medals (
  collection_id uuid not null references public.medal_collections(id) on delete cascade,
  medal_id      uuid not null references public.medals(id)            on delete cascade,
  primary key (collection_id, medal_id)
);

create table public.medal_requirements (
  medal_id    uuid not null references public.medals(id)    on delete cascade,
  monument_id uuid not null references public.monuments(id) on delete cascade,
  primary key (medal_id, monument_id)
);

create table public.user_medals (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  medal_id   uuid not null references public.medals(id)   on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (user_id, medal_id)
);

----------------------------------------------------------------------
-- Función: al insertar visita, otorgar medallas cuyos requisitos estén cumplidos
----------------------------------------------------------------------
create or replace function public.grant_eligible_medals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Medallas elegibles: aquellas donde el user ha visitado todos los monumentos requeridos
  -- (con verified_geo y verified_image) y aún no tiene la medalla.
  insert into public.user_medals (user_id, medal_id)
  select new.user_id, m.id
  from public.medals m
  where not exists (
    select 1 from public.user_medals um
    where um.user_id = new.user_id and um.medal_id = m.id
  )
  and not exists (
    select 1 from public.medal_requirements mr
    where mr.medal_id = m.id
      and not exists (
        select 1 from public.visits v
        where v.user_id     = new.user_id
          and v.monument_id = mr.monument_id
          and v.verified_geo
          and v.verified_image
      )
  )
  -- Solo medallas que tengan al menos un requisito (evita otorgar medallas sin requisitos)
  and exists (select 1 from public.medal_requirements mr where mr.medal_id = m.id);

  -- Sumar puntos al perfil por medallas recién otorgadas
  update public.profiles p
  set total_points = total_points + coalesce((
    select sum(m.points_reward)
    from public.user_medals um
    join public.medals m on m.id = um.medal_id
    where um.user_id = new.user_id
      and um.earned_at >= now() - interval '5 seconds'
  ), 0)
  where p.id = new.user_id;

  return new;
end;
$$;

create trigger on_visit_grant_medals
  after insert or update of verified_geo, verified_image on public.visits
  for each row execute function public.grant_eligible_medals();
