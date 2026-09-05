create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  profile_avatar text;
begin
  profile_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data->>'username'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'Explorador'
  ), 80);

  profile_avatar := nullif(btrim(new.raw_user_meta_data->>'avatar'), '');
  if profile_avatar is not null
     and profile_avatar not in ('quijote', 'sancho', 'dulcinea', 'rocinante') then
    profile_avatar := null;
  end if;

  insert into public.profiles (id, display_name, avatar_url, locale, is_public)
  values (
    new.id,
    profile_name,
    profile_avatar,
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

revoke all on function private.handle_new_user() from public, anon, authenticated;
