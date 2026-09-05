-- These RPCs deliberately expose narrow aggregates while their source tables
-- remain unavailable through the Data API. SECURITY DEFINER is safe here
-- because callers cannot influence identifiers or receive private row data.
alter function public.get_collections_progress() security definer;
alter function public.get_leaderboard(integer) security definer;
alter function public.get_my_rank() security definer;

alter function public.get_collections_progress() set search_path = '';
alter function public.get_leaderboard(integer) set search_path = '';
alter function public.get_my_rank() set search_path = '';

revoke all on function public.get_collections_progress() from public;
revoke all on function public.get_leaderboard(integer) from public;
revoke all on function public.get_my_rank() from public;

grant execute on function public.get_collections_progress() to anon, authenticated;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
grant execute on function public.get_my_rank() to authenticated;
