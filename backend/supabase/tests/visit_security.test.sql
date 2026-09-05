begin;

create extension if not exists pgtap with schema extensions;
select plan(39);

select ok(
  to_regclass('public.spatial_ref_sys') is null,
  'PostGIS metadata tables are not exposed through the public API schema'
);

select ok(
  to_regclass('public.visit_verification_attempts') is null,
  'ephemeral visit challenges are not stored in the public API schema'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  ),
  'the public API schema contains no security-definer functions'
);

select results_eq(
  $$select id from public.monuments_all()$$,
  $$values ('11111111-1111-1111-8111-111111111111'::uuid)$$,
  'geographic RPCs still return the seeded monument after PostGIS relocation'
);

select results_eq(
  $$
    select id, public
    from storage.buckets
    where id in ('mind-targets', 'monument-audio', 'monument-images', 'monument-video')
    order by id
  $$,
  $$ values
    ('mind-targets'::text, true),
    ('monument-audio'::text, true),
    ('monument-images'::text, true),
    ('monument-video'::text, true)
  $$,
  'editorial media buckets are reproducibly configured as public-read'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ),
  0::bigint,
  'no client write policy exists for editorial storage objects'
);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'private@example.test', 'authenticated', 'authenticated', '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000002', 'public@example.test', 'authenticated', 'authenticated', '{}'::jsonb),
  (
    '10000000-0000-4000-8000-000000000003',
    'long-profile@example.test',
    'authenticated',
    'authenticated',
    jsonb_build_object('username', repeat('x', 200), 'avatar', '../admin', 'locale', 'xx')
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'fallback-name@example.test',
    'authenticated',
    'authenticated',
    '{"username":"   ","avatar":"quijote","locale":"en"}'::jsonb
  );

select is(
  (select char_length(display_name) from public.profiles where id = '10000000-0000-4000-8000-000000000003'),
  80,
  'the auth trigger bounds user-controlled display names'
);
select results_eq(
  $$
    select avatar_url, locale
    from public.profiles
    where id = '10000000-0000-4000-8000-000000000003'
  $$,
  $$ values (null::text, 'es'::text) $$,
  'the auth trigger rejects unknown avatars and locales'
);
select results_eq(
  $$
    select display_name, avatar_url, locale, is_public
    from public.profiles
    where id = '10000000-0000-4000-8000-000000000004'
  $$,
  $$ values ('fallback-name'::text, 'quijote'::text, 'en'::text, false) $$,
  'the auth trigger safely derives missing names and preserves valid metadata'
);

update public.profiles
set is_public = true
where id = '10000000-0000-4000-8000-000000000002';

insert into public.follows (follower_id, followed_id)
values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);

select throws_ok(
  $$update public.profiles set display_name = repeat('x', 81) where id = '10000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'profile display names are bounded in the database'
);
select throws_ok(
  $$update public.profiles set bio = repeat('x', 501) where id = '10000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'profile biographies are bounded in the database'
);
select throws_ok(
  $$update public.profiles set avatar_url = repeat('x', 257) where id = '10000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'profile avatar identifiers are bounded in the database'
);

select id as monument_id
from public.monuments
where published
limit 1 \gset

select is(
  (select is_public from public.profiles where id = '10000000-0000-4000-8000-000000000001'),
  false,
  'new profiles are private by default'
);

set local role anon;
select is(
  (select count(*) from public.profiles where id = '10000000-0000-4000-8000-000000000001'),
  0::bigint,
  'anonymous users cannot read private profiles'
);
select is(
  (
    select count(*)
    from public.follows
    where follower_id = '10000000-0000-4000-8000-000000000001'
      and followed_id = '10000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'anonymous users cannot infer a private follower UUID from the social graph'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select is(
  (
    select count(*)
    from public.follows
    where follower_id = '10000000-0000-4000-8000-000000000001'
      and followed_id = '10000000-0000-4000-8000-000000000002'
  ),
  1::bigint,
  'the followed user can still inspect relationships involving their account'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select throws_ok(
  format(
    'insert into public.visits (user_id, monument_id) values (%L, %L)',
    '10000000-0000-4000-8000-000000000001',
    :'monument_id'
  ),
  '42501',
  null,
  'authenticated clients cannot create visits directly'
);
reset role;

select ok(
  not has_table_privilege('authenticated', 'private.visit_verification_attempts', 'SELECT'),
  'verification attempts are not exposed to authenticated clients'
);
select ok(
  not has_table_privilege('authenticated', 'public.visits', 'UPDATE'),
  'authenticated clients cannot update visit verification flags directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.visits', 'DELETE'),
  'authenticated clients cannot delete verified visits directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.complete_visit_verification(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'visit completion RPC is restricted to the service role'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.start_visit_verification(uuid,uuid)',
    'EXECUTE'
  ),
  'visit challenge creation RPC is restricted to the service role'
);
select ok(
  not has_function_privilege('anon', 'public.feed_for_me_rich(integer)', 'EXECUTE'),
  'personalized feed RPC is unavailable to anonymous clients'
);

select has_index(
  'public',
  'profiles',
  'profiles_public_display_name_trgm_idx',
  'public profile name searches have a trigram index'
);

select results_eq(
  $$ select id from public.search_profiles('PUBLIC', 20) $$,
  $$ values ('10000000-0000-4000-8000-000000000002'::uuid) $$,
  'profile search remains case-insensitive and returns only public profiles'
);

select ok(
  (
    select bool_and(p.prosecdef)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname in ('get_collections_progress', 'get_leaderboard', 'get_my_rank')
  ),
  'privileged aggregate implementations live in the private schema'
);

select ok(
  (
    select bool_and(not p.prosecdef)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('get_collections_progress', 'get_leaderboard', 'get_my_rank')
  ),
  'public aggregate RPC contracts execute with invoker privileges'
);

set local role service_role;
insert into private.visit_verification_attempts (user_id, monument_id)
select '10000000-0000-4000-8000-000000000002', :'monument_id'
from generate_series(1, 5);

select is(
  (
    select count(*)
    from public.start_visit_verification(
      '10000000-0000-4000-8000-000000000002',
      :'monument_id'
    )
  ),
  0::bigint,
  'visit challenge creation enforces five attempts per ten minutes'
);

insert into private.visit_verification_attempts (id, user_id, monument_id, created_at, expires_at)
values (
  '20000000-0000-4000-8000-000000000099',
  '10000000-0000-4000-8000-000000000001',
  :'monument_id',
  now() - interval '25 hours',
  now() - interval '24 hours 58 minutes'
);
insert into private.visit_verification_attempts (id, user_id, monument_id)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  :'monument_id'
);

select is(
  (select count(*) from private.visit_verification_attempts where id = '20000000-0000-4000-8000-000000000099'),
  0::bigint,
  'inserting a new challenge purges challenges older than 24 hours'
);

select ok(
  public.complete_visit_verification(
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    :'monument_id'
  ),
  'a fresh server challenge completes a verified visit'
);
select ok(
  not public.complete_visit_verification(
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    :'monument_id'
  ),
  'a challenge cannot be replayed'
);

select results_eq(
  $$
    select verified_geo, verified_image
    from public.visits
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  $$ values (true, true) $$,
  'completed visits require both verification flags'
);

update public.visits
set verified_geo = false, verified_image = false
where user_id = '10000000-0000-4000-8000-000000000001';

select results_eq(
  $$
    select verified_geo, verified_image
    from public.visits
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  $$ values (true, true) $$,
  'verification flags cannot be downgraded'
);

select is(
  (
    select count(*)
    from public.feed_events
    where user_id = '10000000-0000-4000-8000-000000000001'
      and type = 'visit'
  ),
  1::bigint,
  'a verified visit emits exactly one feed event'
);

select is(
  (
    select verified_visit_count
    from public.profiles
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  1,
  'the public visit aggregate counts only verified visits'
);

insert into public.visits (user_id, monument_id, verified_geo, verified_image)
values ('10000000-0000-4000-8000-000000000002', :'monument_id', false, false);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is(
  (
    select count(*)
    from public.visits
    where user_id = '10000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'public profiles do not expose their individual visit rows'
);
reset role;

set local role anon;
select lives_ok(
  $$ select * from public.get_collections_progress() $$,
  'anonymous users can read collection aggregates without table access'
);
select lives_ok(
  $$ select * from public.get_leaderboard(50) $$,
  'anonymous users can read the public leaderboard without table access'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select lives_ok(
  $$ select public.get_my_rank() $$,
  'authenticated users can read their aggregate rank without table access'
);
reset role;

select * from finish();
rollback;
