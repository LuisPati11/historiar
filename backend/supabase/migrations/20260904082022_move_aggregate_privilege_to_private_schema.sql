-- Keep privileged implementation details outside the Data API schema. Public
-- functions remain stable API contracts and execute as the caller.
alter function public.get_collections_progress() set schema private;
alter function public.get_leaderboard(integer) set schema private;
alter function public.get_my_rank() set schema private;

revoke all on function private.get_collections_progress() from public, anon, authenticated;
revoke all on function private.get_leaderboard(integer) from public, anon, authenticated;
revoke all on function private.get_my_rank() from public, anon, authenticated;

grant usage on schema private to anon, authenticated;
grant execute on function private.get_collections_progress() to anon, authenticated;
grant execute on function private.get_leaderboard(integer) to anon, authenticated;
grant execute on function private.get_my_rank() to authenticated;

create function public.get_collections_progress()
returns table (
  collection_id uuid,
  collection_name text,
  collection_description text,
  medal_id uuid,
  medal_name text,
  medal_tier text,
  points_reward int,
  total_monuments bigint,
  visited_monuments bigint,
  earned_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_collections_progress();
$$;

create function public.get_leaderboard(p_limit integer default 50)
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
security invoker
set search_path = ''
as $$
  select * from private.get_leaderboard(p_limit);
$$;

create function public.get_my_rank()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_my_rank();
$$;

revoke all on function public.get_collections_progress() from public;
revoke all on function public.get_leaderboard(integer) from public;
revoke all on function public.get_my_rank() from public;

grant execute on function public.get_collections_progress() to anon, authenticated;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
grant execute on function public.get_my_rank() to authenticated;
