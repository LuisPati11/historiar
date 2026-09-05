alter table public.profiles
  add constraint profiles_display_name_length_check
    check (display_name is null or char_length(btrim(display_name)) between 1 and 80),
  add constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 500),
  add constraint profiles_avatar_url_length_check
    check (avatar_url is null or char_length(avatar_url) <= 256);
