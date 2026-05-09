-- HistoriAR — capa social + soporte multi-idioma.
-- Añade: privacidad de perfil, follows, feed de actividad, traducciones de monumentos/medallas.

----------------------------------------------------------------------
-- profiles: privacidad + bio + idioma preferido
----------------------------------------------------------------------
alter table public.profiles add column if not exists is_public bool not null default false;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists locale text not null default 'es' check (locale in ('es','en'));

----------------------------------------------------------------------
-- follows (N:M autorreferencial sobre profiles)
----------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index follows_followed_idx on public.follows (followed_id);

alter table public.follows enable row level security;

create policy "follows: lectura si el seguidor o seguido es público o uno mismo"
  on public.follows for select
  using (
    auth.uid() = follower_id
    or auth.uid() = followed_id
    or exists (select 1 from public.profiles p where p.id = follows.followed_id and p.is_public)
  );

create policy "follows: el usuario gestiona sus propios follows"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "follows: el usuario borra sus propios follows"
  on public.follows for delete
  using (auth.uid() = follower_id);

----------------------------------------------------------------------
-- feed_events (eventos sociales para el feed)
----------------------------------------------------------------------
create table public.feed_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('visit','medal_earned','collection_completed')),
  monument_id uuid references public.monuments(id) on delete cascade,
  medal_id    uuid references public.medals(id)    on delete cascade,
  created_at  timestamptz not null default now()
);

create index feed_events_user_idx       on public.feed_events (user_id, created_at desc);
create index feed_events_created_at_idx on public.feed_events (created_at desc);

alter table public.feed_events enable row level security;

create policy "feed_events: usuario ve los suyos y de sus seguidos públicos"
  on public.feed_events for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = feed_events.user_id and p.is_public
        and (
          exists (select 1 from public.follows f
                  where f.follower_id = auth.uid() and f.followed_id = feed_events.user_id)
        )
    )
  );

----------------------------------------------------------------------
-- Triggers que generan feed_events automáticamente
----------------------------------------------------------------------
create or replace function public.feed_event_on_visit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.verified_geo and new.verified_image) then
    insert into public.feed_events (user_id, type, monument_id)
    values (new.user_id, 'visit', new.monument_id);
  end if;
  return new;
end;
$$;

create trigger feed_event_after_visit
  after insert or update of verified_geo, verified_image on public.visits
  for each row execute function public.feed_event_on_visit();

create or replace function public.feed_event_on_medal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feed_events (user_id, type, medal_id)
  values (new.user_id, 'medal_earned', new.medal_id);
  return new;
end;
$$;

create trigger feed_event_after_medal
  after insert on public.user_medals
  for each row execute function public.feed_event_on_medal();

----------------------------------------------------------------------
-- Multi-idioma: traducciones de monumentos y medallas
----------------------------------------------------------------------
create table public.monument_translations (
  monument_id uuid not null references public.monuments(id) on delete cascade,
  locale      text not null check (locale in ('es','en')),
  name        text not null,
  description text,
  primary key (monument_id, locale)
);

create table public.medal_translations (
  medal_id    uuid not null references public.medals(id) on delete cascade,
  locale      text not null check (locale in ('es','en')),
  name        text not null,
  description text,
  primary key (medal_id, locale)
);

create table public.collection_translations (
  collection_id uuid not null references public.medal_collections(id) on delete cascade,
  locale        text not null check (locale in ('es','en')),
  name          text not null,
  description   text,
  primary key (collection_id, locale)
);

alter table public.monument_translations   enable row level security;
alter table public.medal_translations      enable row level security;
alter table public.collection_translations enable row level security;

create policy "monument_translations: lectura pública"   on public.monument_translations   for select using (true);
create policy "medal_translations: lectura pública"      on public.medal_translations      for select using (true);
create policy "collection_translations: lectura pública" on public.collection_translations for select using (true);

----------------------------------------------------------------------
-- RPC: feed combinado del usuario actual (sus eventos + de quienes sigue)
----------------------------------------------------------------------
create or replace function public.feed_for_me(p_limit int default 50)
returns table (
  id          uuid,
  user_id     uuid,
  user_name   text,
  type        text,
  monument_id uuid,
  medal_id    uuid,
  created_at  timestamptz
)
language sql
stable
as $$
  select fe.id, fe.user_id, p.display_name, fe.type, fe.monument_id, fe.medal_id, fe.created_at
  from public.feed_events fe
  join public.profiles p on p.id = fe.user_id
  where fe.user_id = auth.uid()
     or exists (
       select 1 from public.follows f
       where f.follower_id = auth.uid()
         and f.followed_id = fe.user_id
         and p.is_public
     )
  order by fe.created_at desc
  limit p_limit;
$$;
