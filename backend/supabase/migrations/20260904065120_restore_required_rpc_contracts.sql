-- Restaura todos los contratos RPC consumidos por el frontend y declara sus
-- permisos de Data API de forma explicita.

drop function if exists public.get_monument_by_id(uuid);
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
    public.st_y(m.location::public.geometry),
    public.st_x(m.location::public.geometry)
  from public.monuments m
  where m.id = p_id and m.published;
$$;

drop function if exists public.get_collection_monuments(uuid, int);
create function public.get_collection_monuments(
  p_collection_id uuid,
  p_limit int default 4
)
returns table (
  id uuid,
  name text,
  reference_image_url text
)
language sql
stable
set search_path = ''
as $$
  select distinct m.id, m.name, m.reference_image_url
  from public.collection_medals cm
  join public.medal_requirements mr on mr.medal_id = cm.medal_id
  join public.monuments m on m.id = mr.monument_id
  where cm.collection_id = p_collection_id
    and m.published
  order by m.name
  limit least(greatest(coalesce(p_limit, 4), 1), 100);
$$;

drop function if exists public.feed_for_me_rich(int);
create function public.feed_for_me_rich(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  user_name text,
  user_avatar text,
  type text,
  monument_id uuid,
  monument_name text,
  medal_id uuid,
  medal_name text,
  created_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    fe.id,
    fe.user_id,
    coalesce(p.display_name, ''),
    p.avatar_url,
    fe.type,
    fe.monument_id,
    m.name,
    fe.medal_id,
    md.name,
    fe.created_at
  from public.feed_events fe
  join public.profiles p on p.id = fe.user_id
  left join public.monuments m on m.id = fe.monument_id
  left join public.medals md on md.id = fe.medal_id
  where fe.user_id = auth.uid()
     or (
       p.is_public
       and exists (
         select 1
         from public.follows f
         where f.follower_id = auth.uid()
           and f.followed_id = fe.user_id
       )
     )
  order by fe.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

drop function if exists public.monuments_nearby(double precision, double precision, int, bool);
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
    public.st_distance(
      m.location,
      public.st_setsrid(public.st_makepoint(p_lng, p_lat), 4326)::public.geography
    ),
    m.reference_image_url,
    m.mind_target_url,
    m.video_url,
    m.audio_url,
    (select min(mp.year_from) from public.monument_periods mp where mp.monument_id = m.id)::int,
    public.st_y(m.location::public.geometry),
    public.st_x(m.location::public.geometry)
  from public.monuments m
  where m.published
    and p_lat between -90 and 90
    and p_lng between -180 and 180
    and public.st_dwithin(
      m.location,
      public.st_setsrid(public.st_makepoint(p_lng, p_lat), 4326)::public.geography,
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
  order by public.st_distance(
    m.location,
    public.st_setsrid(public.st_makepoint(p_lng, p_lat), 4326)::public.geography
  );
$$;

drop function if exists public.monuments_all();
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
    public.st_y(m.location::public.geometry),
    public.st_x(m.location::public.geometry)
  from public.monuments m
  where m.published
  order by m.name;
$$;

revoke all on function public.get_monument_by_id(uuid) from public;
revoke all on function public.get_collection_monuments(uuid, int) from public;
revoke all on function public.feed_for_me_rich(int) from public;
revoke all on function public.monuments_nearby(double precision, double precision, int, bool) from public;
revoke all on function public.monuments_all() from public;

grant execute on function public.get_monument_by_id(uuid) to anon, authenticated;
grant execute on function public.get_collection_monuments(uuid, int) to anon, authenticated;
grant execute on function public.feed_for_me_rich(int) to authenticated;
grant execute on function public.monuments_nearby(double precision, double precision, int, bool) to anon, authenticated;
grant execute on function public.monuments_all() to anon, authenticated;

-- Las RPC sociales restantes tambien declaran el rol que puede ejecutarlas.
revoke all on function public.get_collections_progress() from public;
revoke all on function public.get_leaderboard(integer) from public;
revoke all on function public.get_my_rank() from public;
revoke all on function public.search_profiles(text, integer) from public;
grant execute on function public.get_collections_progress() to anon, authenticated;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
grant execute on function public.get_my_rank() to authenticated;
grant execute on function public.search_profiles(text, integer) to authenticated;
