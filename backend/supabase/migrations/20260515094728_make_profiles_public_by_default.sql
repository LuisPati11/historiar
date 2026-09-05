-- De momento HistoriAR no usa perfiles privados: todos los perfiles existentes
-- y futuros deben ser públicos para poder ver medallas, colecciones y actividad.

update public.profiles
set is_public = true
where is_public = false;

alter table public.profiles
alter column is_public set default true;

drop policy if exists "profiles: usuario actualiza el suyo"
on public.profiles;

create policy "profiles: usuario actualiza el suyo"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id and is_public = true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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
    true
  )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    locale = excluded.locale,
    is_public = true;

  return new;
end;
$$;
