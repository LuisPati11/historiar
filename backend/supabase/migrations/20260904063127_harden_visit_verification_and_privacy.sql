-- Restaura las decisiones de producto de privacidad y endurece la validacion
-- de visitas. Esta migracion corrige de forma aditiva estados introducidos por
-- migraciones anteriores ya aplicadas.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

----------------------------------------------------------------------
-- Privacidad de perfiles
----------------------------------------------------------------------
alter table public.profiles
  alter column is_public set default false;

-- Una migracion anterior hizo publicos todos los perfiles sin opt-in. No es
-- posible distinguirlos de un opt-in real, por lo que el restablecimiento
-- seguro es devolverlos todos a privado.
update public.profiles set is_public = false;

drop policy if exists "profiles: lectura pública" on public.profiles;
drop policy if exists "profiles: lectura propia o pública" on public.profiles;
create policy "profiles: lectura propia o pública"
  on public.profiles for select
  to anon, authenticated
  using (is_public or auth.uid() = id);

drop policy if exists "profiles: usuario actualiza el suyo" on public.profiles;
create policy "profiles: usuario actualiza el suyo"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, bio, locale, is_public)
  on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, locale, is_public)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar',
    case
      when new.raw_user_meta_data->>'locale' in ('es', 'en') then new.raw_user_meta_data->>'locale'
      else 'es'
    end,
    false
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      locale = excluded.locale;
  return new;
end;
$$;

----------------------------------------------------------------------
-- Solo el backend privilegiado puede crear o verificar visitas
----------------------------------------------------------------------
drop policy if exists "visits: usuario crea las suyas (sin verificación)" on public.visits;
drop policy if exists "visits: ver visitas de perfiles públicos" on public.visits;
revoke insert, update, delete on public.visits from anon, authenticated;

-- Los totales sociales se publican como agregado, nunca exponiendo las filas
-- con la fecha y el monumento concreto de cada visita.
alter table public.profiles
  add column if not exists verified_visit_count integer not null default 0
  check (verified_visit_count >= 0);

update public.profiles p
set verified_visit_count = (
  select count(*)::integer
  from public.visits v
  where v.user_id = p.id
    and v.verified_geo
    and v.verified_image
);

create or replace function private.sync_verified_visit_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_user uuid := coalesce(new.user_id, old.user_id);
begin
  update public.profiles p
  set verified_visit_count = (
    select count(*)::integer
    from public.visits v
    where v.user_id = affected_user
      and v.verified_geo
      and v.verified_image
  )
  where p.id = affected_user;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_verified_visit_count on public.visits;
create trigger sync_verified_visit_count
  after insert or update of verified_geo, verified_image or delete on public.visits
  for each row execute function private.sync_verified_visit_count();

-- Una verificacion verdadera nunca puede degradarse por un reintento fallido.
create or replace function private.keep_visit_verification_monotonic()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.verified_geo := old.verified_geo or new.verified_geo;
  new.verified_image := old.verified_image or new.verified_image;
  return new;
end;
$$;

drop trigger if exists keep_visit_verification_monotonic on public.visits;
create trigger keep_visit_verification_monotonic
  before update of verified_geo, verified_image on public.visits
  for each row execute function private.keep_visit_verification_monotonic();

----------------------------------------------------------------------
-- Reto de verificacion efimero y de un solo uso
----------------------------------------------------------------------
create table public.visit_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  monument_id uuid not null references public.monuments(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  consumed_at timestamptz,
  check (expires_at > created_at)
);

create index visit_verification_attempts_user_created_idx
  on public.visit_verification_attempts (user_id, created_at desc);

alter table public.visit_verification_attempts enable row level security;
revoke all on public.visit_verification_attempts from public, anon, authenticated;
grant all on public.visit_verification_attempts to service_role;

create or replace function public.complete_visit_verification(
  p_attempt_id uuid,
  p_user_id uuid,
  p_monument_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  consumed_id uuid;
begin
  update public.visit_verification_attempts
  set consumed_at = now()
  where id = p_attempt_id
    and user_id = p_user_id
    and monument_id = p_monument_id
    and consumed_at is null
    and expires_at > now()
  returning id into consumed_id;

  if consumed_id is null then
    return false;
  end if;

  insert into public.visits (user_id, monument_id, verified_geo, verified_image)
  values (p_user_id, p_monument_id, true, true)
  on conflict (user_id, monument_id) do update
  set verified_geo = true,
      verified_image = true;

  return true;
end;
$$;

revoke all on function public.complete_visit_verification(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_visit_verification(uuid, uuid, uuid) to service_role;

----------------------------------------------------------------------
-- Eventos y medallas idempotentes
----------------------------------------------------------------------
delete from public.feed_events a
using public.feed_events b
where a.type = 'visit'
  and b.type = 'visit'
  and a.user_id = b.user_id
  and a.monument_id = b.monument_id
  and a.created_at > b.created_at;

create unique index if not exists feed_events_unique_visit_idx
  on public.feed_events (user_id, monument_id)
  where type = 'visit' and monument_id is not null;

create or replace function private.feed_event_on_visit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.verified_geo and new.verified_image
     and (tg_op = 'INSERT' or not (old.verified_geo and old.verified_image)) then
    insert into public.feed_events (user_id, type, monument_id)
    values (new.user_id, 'visit', new.monument_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists feed_event_after_visit on public.visits;
create trigger feed_event_after_visit
  after insert or update of verified_geo, verified_image on public.visits
  for each row execute function private.feed_event_on_visit();

create or replace function public.grant_eligible_medals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (new.verified_geo and new.verified_image) then
    return new;
  end if;

  insert into public.user_medals (user_id, medal_id)
  select new.user_id, m.id
  from public.medals m
  where not exists (
    select 1
    from public.medal_requirements mr
    where mr.medal_id = m.id
      and not exists (
        select 1
        from public.visits v
        where v.user_id = new.user_id
          and v.monument_id = mr.monument_id
          and v.verified_geo
          and v.verified_image
      )
  )
  and exists (
    select 1 from public.medal_requirements mr where mr.medal_id = m.id
  )
  on conflict (user_id, medal_id) do nothing;

  return new;
end;
$$;

----------------------------------------------------------------------
-- Consultas sociales: solo visitas verificadas y limites acotados
----------------------------------------------------------------------
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
set search_path = ''
as $$
  select
    row_number() over (
      order by count(distinct um.medal_id) desc,
               count(distinct v.id) desc,
               p.display_name asc nulls last
    ),
    p.id,
    p.display_name,
    p.avatar_url,
    0::integer,
    count(distinct v.id),
    count(distinct um.medal_id)
  from public.profiles p
  left join public.visits v
    on v.user_id = p.id and v.verified_geo and v.verified_image
  left join public.user_medals um on um.user_id = p.id
  where p.is_public
  group by p.id, p.display_name, p.avatar_url
  order by count(distinct um.medal_id) desc,
           count(distinct v.id) desc,
           p.display_name asc nulls last
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function public.get_my_rank()
returns bigint
language sql
stable
set search_path = ''
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
    left join public.visits v
      on v.user_id = p.id and v.verified_geo and v.verified_image
    left join public.user_medals um on um.user_id = p.id
    where p.is_public
    group by p.id, p.display_name
  )
  select rank from ranked where id = auth.uid();
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
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    0::integer,
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followed_id = p.id
    )
  from public.profiles p
  where p.is_public
    and length(trim(coalesce(p_query, ''))) between 2 and 80
    and p.display_name ilike '%' || trim(p_query) || '%'
    and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  order by p.display_name asc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.get_collections_progress()
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
set search_path = ''
as $$
  with user_touched_monuments as (
    select mr.monument_id
    from public.medal_requirements mr
    join public.user_medals um
      on um.medal_id = mr.medal_id and um.user_id = auth.uid()
    union
    select v.monument_id
    from public.visits v
    where v.user_id = auth.uid()
      and v.verified_geo
      and v.verified_image
  )
  select
    mc.id,
    mc.name,
    mc.description,
    m.id,
    m.name,
    m.tier,
    m.points_reward,
    count(distinct mr.monument_id)::bigint,
    count(distinct case when utm.monument_id is not null then mr.monument_id end)::bigint,
    um_coll.earned_at
  from public.medal_collections mc
  join public.collection_medals cm on cm.collection_id = mc.id
  join public.medals m on m.id = cm.medal_id
  join public.medal_requirements mr on mr.medal_id = m.id
  left join user_touched_monuments utm on utm.monument_id = mr.monument_id
  left join public.user_medals um_coll
    on um_coll.medal_id = m.id and um_coll.user_id = auth.uid()
  group by mc.id, mc.name, mc.description, m.id, m.name, m.tier,
           m.points_reward, um_coll.earned_at
  order by um_coll.earned_at desc nulls last, mc.name;
$$;

drop policy if exists "follows: el usuario gestiona sus propios follows" on public.follows;
create policy "follows: el usuario sigue perfiles públicos"
  on public.follows for insert
  to authenticated
  with check (
    auth.uid() = follower_id
    and exists (
      select 1 from public.profiles p
      where p.id = followed_id and p.is_public
    )
  );

----------------------------------------------------------------------
-- Datos AR e indices de claves foraneas
----------------------------------------------------------------------
alter table public.monuments add column if not exists mind_target_url text;

create index if not exists visits_monument_idx on public.visits (monument_id);
create index if not exists collection_medals_medal_idx on public.collection_medals (medal_id);
create index if not exists medal_requirements_monument_idx on public.medal_requirements (monument_id);
create index if not exists user_medals_medal_idx on public.user_medals (medal_id);
create index if not exists feed_events_monument_idx on public.feed_events (monument_id);
create index if not exists feed_events_medal_idx on public.feed_events (medal_id);
