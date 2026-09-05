create index if not exists visit_verification_attempts_monument_idx
  on public.visit_verification_attempts (monument_id);

drop policy if exists "profiles: lectura propia o pública" on public.profiles;
create policy "profiles: lectura propia o pública"
  on public.profiles for select
  to anon, authenticated
  using (is_public or (select auth.uid()) = id);

drop policy if exists "profiles: usuario actualiza el suyo" on public.profiles;
create policy "profiles: usuario actualiza el suyo"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "visits: usuario ve las suyas" on public.visits;
create policy "visits: usuario ve las suyas"
  on public.visits for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_medals: usuario ve las suyas" on public.user_medals;
create policy "user_medals: usuario ve las suyas"
  on public.user_medals for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "follows: lectura si el seguidor o seguido es público o uno mismo" on public.follows;
create policy "follows: relaciones propias o entre perfiles públicos"
  on public.follows for select
  to anon, authenticated
  using (
    (select auth.uid()) = follower_id
    or (select auth.uid()) = followed_id
    or (
      exists (
        select 1 from public.profiles follower
        where follower.id = follower_id and follower.is_public
      )
      and exists (
        select 1 from public.profiles followed
        where followed.id = followed_id and followed.is_public
      )
    )
  );

drop policy if exists "follows: el usuario sigue perfiles públicos" on public.follows;
create policy "follows: el usuario sigue perfiles públicos"
  on public.follows for insert
  to authenticated
  with check (
    (select auth.uid()) = follower_id
    and exists (
      select 1 from public.profiles followed
      where followed.id = followed_id and followed.is_public
    )
  );

drop policy if exists "follows: el usuario borra sus propios follows" on public.follows;
create policy "follows: el usuario borra sus propios follows"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

drop policy if exists "feed_events: usuario ve los suyos y de sus seguidos públicos" on public.feed_events;
create policy "feed_events: usuario ve los suyos y de sus seguidos públicos"
  on public.feed_events for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.profiles p
      join public.follows f on f.followed_id = p.id
      where p.id = feed_events.user_id
        and p.is_public
        and f.follower_id = (select auth.uid())
    )
  );
