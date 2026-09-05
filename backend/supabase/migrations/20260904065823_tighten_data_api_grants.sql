-- Sustituye los privilegios amplios creados por los defaults historicos de
-- Supabase por una lista de acceso minima y auditable.

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;

grant select on table
  public.profiles,
  public.monuments,
  public.monument_periods,
  public.medals,
  public.medal_collections,
  public.collection_medals,
  public.medal_requirements,
  public.user_medals,
  public.monument_translations,
  public.medal_translations,
  public.collection_translations,
  public.follows
to anon, authenticated;

grant select on table public.visits, public.feed_events to authenticated;
grant insert, delete on table public.follows to authenticated;
grant update (display_name, avatar_url, bio, locale, is_public)
  on table public.profiles to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

drop function if exists public.feed_for_me(integer);
drop function if exists public.feed_event_on_visit();

create or replace function private.feed_event_on_medal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.feed_events (user_id, type, medal_id)
  values (new.user_id, 'medal_earned', new.medal_id);
  return new;
end;
$$;

drop trigger if exists feed_event_after_medal on public.user_medals;
create trigger feed_event_after_medal
  after insert on public.user_medals
  for each row execute function private.feed_event_on_medal();
drop function if exists public.feed_event_on_medal();

create or replace function public.monument_within(
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
      and public.st_dwithin(
        m.location,
        public.st_setsrid(public.st_makepoint(p_lng, p_lat), 4326)::public.geography,
        least(greatest(coalesce(p_radius_m, 75), 1), 50000)
      )
  );
$$;

revoke all on all functions in schema private from public, anon, authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.grant_eligible_medals() from public, anon, authenticated;
revoke all on function public.complete_visit_verification(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.monument_within(uuid, double precision, double precision, integer) from public, anon, authenticated;
revoke all on function public.monuments_nearby(double precision, double precision, integer, boolean) from public, anon, authenticated;
revoke all on function public.monuments_all() from public, anon, authenticated;
revoke all on function public.get_monument_by_id(uuid) from public, anon, authenticated;
revoke all on function public.get_collection_monuments(uuid, integer) from public, anon, authenticated;
revoke all on function public.feed_for_me_rich(integer) from public, anon, authenticated;
revoke all on function public.get_collections_progress() from public, anon, authenticated;
revoke all on function public.get_leaderboard(integer) from public, anon, authenticated;
revoke all on function public.get_my_rank() from public, anon, authenticated;
revoke all on function public.search_profiles(text, integer) from public, anon, authenticated;

grant execute on function public.complete_visit_verification(uuid, uuid, uuid) to service_role;
grant execute on function public.monument_within(uuid, double precision, double precision, integer) to anon, authenticated, service_role;
grant execute on function public.monuments_nearby(double precision, double precision, integer, boolean) to anon, authenticated;
grant execute on function public.monuments_all() to anon, authenticated;
grant execute on function public.get_monument_by_id(uuid) to anon, authenticated;
grant execute on function public.get_collection_monuments(uuid, integer) to anon, authenticated;
grant execute on function public.feed_for_me_rich(integer) to authenticated;
grant execute on function public.get_collections_progress() to anon, authenticated;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
grant execute on function public.get_my_rank() to authenticated;
grant execute on function public.search_profiles(text, integer) to authenticated;

-- Evita que tablas y funciones nuevas vuelvan a heredar permisos de escritura
-- amplios al crearse mediante el rol de migraciones.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
