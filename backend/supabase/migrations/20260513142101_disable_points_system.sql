-- Desactiva temporalmente el sistema de puntos.
-- Conservamos las columnas para compatibilidad, pero el producto ya no debe
-- calcular, mostrar ni ordenar nada por puntos.

update public.profiles
set total_points = 0;

update public.medals
set points_reward = 0;

create or replace function public.grant_eligible_medals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
  and exists (select 1 from public.medal_requirements mr where mr.medal_id = m.id);

  return new;
end;
$$;

create or replace function public.get_leaderboard(p_limit integer default 50)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points integer,
  visit_count bigint,
  medal_count bigint
)
language sql
stable
as $$
  select
    row_number() over (
      order by count(distinct um.medal_id) desc,
               count(distinct v.id) desc,
               p.display_name asc nulls last
    ) as rank,
    p.id,
    p.display_name,
    p.avatar_url,
    0::integer as total_points,
    count(distinct v.id) as visit_count,
    count(distinct um.medal_id) as medal_count
  from public.profiles p
  left join public.visits v on v.user_id = p.id
  left join public.user_medals um on um.user_id = p.id
  where p.is_public = true
  group by p.id, p.display_name, p.avatar_url
  order by medal_count desc, visit_count desc, p.display_name asc nulls last
  limit p_limit;
$$;

create or replace function public.search_profiles(p_query text, p_limit integer default 20)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  total_points integer,
  is_following boolean
)
language sql
stable
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    0::integer as total_points,
    exists (
      select 1
      from public.follows
      where follower_id = auth.uid() and followed_id = p.id
    ) as is_following
  from public.profiles p
  where p.display_name ilike '%' || p_query || '%'
    and p.id != coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  order by p.display_name asc nulls last
  limit p_limit;
$$;

create or replace function public.get_my_rank()
returns bigint
language sql
stable
as $$
  with ranked as (
    select
      p.id,
      row_number() over (
        order by count(distinct um.medal_id) desc,
                 count(distinct v.id) desc,
                 p.display_name asc nulls last
      ) as rank
    from public.profiles p
    left join public.visits v on v.user_id = p.id
    left join public.user_medals um on um.user_id = p.id
    where p.is_public = true
    group by p.id, p.display_name
  )
  select rank
  from ranked
  where id = auth.uid();
$$;
