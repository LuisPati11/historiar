-- Row Level Security: cada usuario solo ve/modifica lo suyo.
-- Monumentos y medallas publicados son lectura pública.

----------------------------------------------------------------------
-- profiles
----------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: lectura pública"
  on public.profiles for select
  using (true);

create policy "profiles: usuario actualiza el suyo"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

----------------------------------------------------------------------
-- monuments / monument_periods (catálogo público de solo lectura)
----------------------------------------------------------------------
alter table public.monuments        enable row level security;
alter table public.monument_periods enable row level security;

create policy "monuments: publicados visibles a todos"
  on public.monuments for select
  using (published = true);

create policy "monument_periods: visibles si el monumento es público"
  on public.monument_periods for select
  using (exists (
    select 1 from public.monuments m
    where m.id = monument_periods.monument_id and m.published
  ));

----------------------------------------------------------------------
-- visits (cada usuario ve/inserta solo las suyas; las verificaciones las
-- hace una edge function con service-role, no el cliente)
----------------------------------------------------------------------
alter table public.visits enable row level security;

create policy "visits: usuario ve las suyas"
  on public.visits for select
  using (auth.uid() = user_id);

create policy "visits: usuario crea las suyas (sin verificación)"
  on public.visits for insert
  with check (auth.uid() = user_id and verified_geo = false and verified_image = false);

----------------------------------------------------------------------
-- medals / medal_collections / collection_medals / medal_requirements
-- (catálogo público de lectura)
----------------------------------------------------------------------
alter table public.medals             enable row level security;
alter table public.medal_collections  enable row level security;
alter table public.collection_medals  enable row level security;
alter table public.medal_requirements enable row level security;

create policy "medals: lectura pública"             on public.medals             for select using (true);
create policy "medal_collections: lectura pública"  on public.medal_collections  for select using (true);
create policy "collection_medals: lectura pública"  on public.collection_medals  for select using (true);
create policy "medal_requirements: lectura pública" on public.medal_requirements for select using (true);

----------------------------------------------------------------------
-- user_medals (lectura propia; escritura solo vía trigger / service role)
----------------------------------------------------------------------
alter table public.user_medals enable row level security;

create policy "user_medals: usuario ve las suyas"
  on public.user_medals for select
  using (auth.uid() = user_id);
