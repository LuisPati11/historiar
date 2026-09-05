-- Datos iniciales: Puerta de Toledo (Ciudad Real) + medalla y colección de ejemplo.

insert into public.monuments (id, name, city, country, location, description, tags, published)
values (
  '11111111-1111-1111-8111-111111111111',
  'Puerta de Toledo',
  'Ciudad Real',
  'España',
  extensions.ST_SetSRID(extensions.ST_MakePoint(-3.9286, 38.9863), 4326)::extensions.geography,
  'Última puerta superviviente de la muralla medieval que rodeaba Ciudad Real, mandada construir por Alfonso XI en el siglo XIV.',
  array['ciudad-real','medieval','siglo-xiv','muralla'],
  true
);

insert into public.monument_periods (monument_id, year_from, year_to, title, description, order_index)
values
  ('11111111-1111-1111-8111-111111111111', 1328, 1346, 'Construcción bajo Alfonso XI',
   'Levantada como parte de la muralla defensiva de la villa real fundada por Alfonso X.', 0),
  ('11111111-1111-1111-8111-111111111111', 1500, 1700, 'Edad Moderna',
   'Pierde función defensiva y se integra en el tejido urbano como acceso principal a la ciudad.', 1),
  ('11111111-1111-1111-8111-111111111111', 1900, 2000, 'Restauraciones contemporáneas',
   'Declarada Monumento Histórico-Artístico Nacional en 1915 y restaurada en varias ocasiones.', 2);

-- Medalla individual de la Puerta de Toledo
insert into public.medals (id, name, description, tier)
values (
  '22222222-2222-2222-8222-222222222222',
  'Centinela de la Puerta de Toledo',
  'Has visitado la Puerta de Toledo en Ciudad Real.',
  'bronze'
);

insert into public.medal_requirements (medal_id, monument_id)
values ('22222222-2222-2222-8222-222222222222', '11111111-1111-1111-8111-111111111111');

-- Colección "10 Monumentos de Ciudad Real – Medalla Culiparda" (placeholder, completar al añadir más)
insert into public.medal_collections (id, name, description, is_premium)
values (
  '33333333-3333-3333-8333-333333333333',
  '10 Monumentos de Ciudad Real – Medalla Culiparda',
  'Visita los 10 monumentos imprescindibles de Ciudad Real para conseguir la Medalla Culiparda.',
  false
);

insert into public.collection_medals (collection_id, medal_id)
values ('33333333-3333-3333-8333-333333333333', '22222222-2222-2222-8222-222222222222');

----------------------------------------------------------------------
-- Traducciones EN
----------------------------------------------------------------------
insert into public.monument_translations (monument_id, locale, name, description) values
  ('11111111-1111-1111-8111-111111111111', 'en',
   'Toledo Gate',
   'The last surviving gate of the medieval wall of Ciudad Real, ordered by King Alfonso XI in the 14th century.');

insert into public.medal_translations (medal_id, locale, name, description) values
  ('22222222-2222-2222-8222-222222222222', 'en',
   'Sentinel of the Toledo Gate',
   'You have visited the Toledo Gate in Ciudad Real.');

insert into public.collection_translations (collection_id, locale, name, description) values
  ('33333333-3333-3333-8333-333333333333', 'en',
   '10 Monuments of Ciudad Real – Culiparda Medal',
   'Visit the 10 essential monuments of Ciudad Real to earn the Culiparda Medal.');
