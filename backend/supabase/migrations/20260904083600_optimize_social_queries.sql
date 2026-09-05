create extension if not exists pg_trgm with schema extensions;

create index if not exists profiles_public_display_name_trgm_idx
  on public.profiles using gin (lower(display_name) extensions.gin_trgm_ops)
  where is_public and display_name is not null;

create index if not exists visits_verified_user_idx
  on public.visits (user_id)
  where verified_geo and verified_image;

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
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    0::integer,
    exists (
      select 1
      from public.follows f
      where f.follower_id = (select auth.uid()) and f.followed_id = p.id
    )
  from public.profiles p
  where p.is_public
    and length(trim(coalesce(p_query, ''))) between 2 and 80
    and lower(p.display_name) like '%' || lower(trim(p_query)) || '%'
    and p.id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
  order by p.display_name asc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function private.get_leaderboard(p_limit integer default 50)
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
security definer
set search_path = ''
as $$
  with visit_counts as (
    select v.user_id, count(*)::bigint as visit_count
    from public.visits v
    where v.verified_geo and v.verified_image
    group by v.user_id
  ),
  medal_counts as (
    select um.user_id, count(*)::bigint as medal_count
    from public.user_medals um
    group by um.user_id
  ),
  ranked as (
    select
      row_number() over (
        order by coalesce(mc.medal_count, 0) desc,
                 coalesce(vc.visit_count, 0) desc,
                 p.display_name asc nulls last
      ) as rank,
      p.id as user_id,
      p.display_name,
      p.avatar_url,
      0::integer as total_points,
      coalesce(vc.visit_count, 0)::bigint as visit_count,
      coalesce(mc.medal_count, 0)::bigint as medal_count
    from public.profiles p
    left join visit_counts vc on vc.user_id = p.id
    left join medal_counts mc on mc.user_id = p.id
    where p.is_public
  )
  select *
  from ranked
  order by rank
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function private.get_my_rank()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  with visit_counts as (
    select v.user_id, count(*)::bigint as visit_count
    from public.visits v
    where v.verified_geo and v.verified_image
    group by v.user_id
  ),
  medal_counts as (
    select um.user_id, count(*)::bigint as medal_count
    from public.user_medals um
    group by um.user_id
  ),
  ranked as (
    select
      p.id,
      row_number() over (
        order by coalesce(mc.medal_count, 0) desc,
                 coalesce(vc.visit_count, 0) desc,
                 p.display_name asc nulls last
      ) as rank
    from public.profiles p
    left join visit_counts vc on vc.user_id = p.id
    left join medal_counts mc on mc.user_id = p.id
    where p.is_public
  )
  select rank from ranked where id = (select auth.uid());
$$;

revoke all on function public.search_profiles(text, integer) from public, anon;
grant execute on function public.search_profiles(text, integer) to authenticated;

revoke all on function private.get_leaderboard(integer) from public, anon, authenticated;
revoke all on function private.get_my_rank() from public, anon, authenticated;
grant execute on function private.get_leaderboard(integer) to anon, authenticated;
grant execute on function private.get_my_rank() to authenticated;
