insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('monument-images', 'monument-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('mind-targets', 'mind-targets', true, 20971520, array['application/octet-stream']),
  ('monument-video', 'monument-video', true, 209715200, array['video/mp4', 'video/webm']),
  ('monument-audio', 'monument-audio', true, 31457280, array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    updated_at = now();
