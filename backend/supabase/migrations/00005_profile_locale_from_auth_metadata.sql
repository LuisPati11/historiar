-- Mantiene profiles alineado con los metadatos elegidos en el registro.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar',
    case
      when new.raw_user_meta_data->>'locale' in ('es', 'en') then new.raw_user_meta_data->>'locale'
      else 'es'
    end
  )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    locale = excluded.locale;

  return new;
end;
$$;
