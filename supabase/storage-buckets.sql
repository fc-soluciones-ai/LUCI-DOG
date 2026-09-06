-- ============================================================================
-- GroomingOS / Luci Dog — Supabase Storage: buckets + políticas RLS
--
-- Ejecutar en Supabase Dashboard → SQL Editor → New query. Es idempotente:
-- se puede correr varias veces sin duplicar buckets ni políticas.
--
-- Contexto: hoy la app sube archivos SIEMPRE desde el servidor (Server
-- Actions) usando la Service Role Key (ver src/lib/supabase/admin.ts), que
-- ignora RLS por diseño. Estas políticas no son necesarias para que la app
-- funcione tal como está, pero:
--   1) el bucket debe existir y estar marcado como público para que las URLs
--      públicas (getPublicUrl) sirvan las fotos/comprobantes sin firmar, y
--   2) dejan el camino listo por si en el futuro se sube directo desde el
--      navegador (evitando el límite de body de Vercel/Next.js).
-- ============================================================================

-- 1) Buckets -----------------------------------------------------------------
-- file_size_limit en bytes (4 MB = 4194304), alineado con el límite de
-- subida del cliente (src/lib/client/imageUpload.ts) y del Server Action
-- (next.config.mjs → experimental.serverActions.bodySizeLimit).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pets-photos',      'pets-photos',      true, 4194304, array['image/jpeg', 'image/png', 'image/webp']),
  ('payment-receipts', 'payment-receipts', true, 4194304, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('services-images',  'services-images',  true, 4194304, array['image/jpeg', 'image/png', 'image/webp']),
  ('branding-assets',  'branding-assets',  true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) Lectura pública -----------------------------------------------------------
-- Necesaria para que las URLs públicas (fotos de mascota, comprobantes,
-- imágenes de servicio, marca) se puedan ver sin firmar ni loguearse.

drop policy if exists "Public read pets-photos" on storage.objects;
create policy "Public read pets-photos"
  on storage.objects for select
  to public
  using (bucket_id = 'pets-photos');

drop policy if exists "Public read payment-receipts" on storage.objects;
create policy "Public read payment-receipts"
  on storage.objects for select
  to public
  using (bucket_id = 'payment-receipts');

drop policy if exists "Public read services-images" on storage.objects;
create policy "Public read services-images"
  on storage.objects for select
  to public
  using (bucket_id = 'services-images');

drop policy if exists "Public read branding-assets" on storage.objects;
create policy "Public read branding-assets"
  on storage.objects for select
  to public
  using (bucket_id = 'branding-assets');

-- 3) Escritura (INSERT/UPDATE) — solo usuarios autenticados ---------------------
-- Deliberadamente NO se incluye el rol "anon" aquí: darle INSERT a "anon"
-- significaría que cualquier persona en internet, sin haber iniciado sesión,
-- podría subir archivos arbitrarios a estos buckets usando la anon key
-- pública (que ya viaja en el bundle del navegador) — abuso de
-- almacenamiento/costos y contenido no deseado, sin ningún control de dueño
-- del recurso (a diferencia de las Server Actions, que sí validan que la
-- mascota/factura pertenezca al tutor de la sesión). Si en el futuro se migra
-- a subida directa desde el navegador, debe hacerse con URLs firmadas
-- (createSignedUploadUrl) generadas por el servidor tras validar el dueño,
-- nunca abriendo INSERT a "anon".

drop policy if exists "Authenticated write pets-photos" on storage.objects;
create policy "Authenticated write pets-photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'pets-photos');

drop policy if exists "Authenticated update pets-photos" on storage.objects;
create policy "Authenticated update pets-photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'pets-photos')
  with check (bucket_id = 'pets-photos');

drop policy if exists "Authenticated write payment-receipts" on storage.objects;
create policy "Authenticated write payment-receipts"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'payment-receipts');

drop policy if exists "Authenticated update payment-receipts" on storage.objects;
create policy "Authenticated update payment-receipts"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'payment-receipts')
  with check (bucket_id = 'payment-receipts');

drop policy if exists "Authenticated write services-images" on storage.objects;
create policy "Authenticated write services-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'services-images');

drop policy if exists "Authenticated update services-images" on storage.objects;
create policy "Authenticated update services-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'services-images')
  with check (bucket_id = 'services-images');

drop policy if exists "Authenticated write branding-assets" on storage.objects;
create policy "Authenticated write branding-assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'branding-assets');

drop policy if exists "Authenticated update branding-assets" on storage.objects;
create policy "Authenticated update branding-assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'branding-assets')
  with check (bucket_id = 'branding-assets');
