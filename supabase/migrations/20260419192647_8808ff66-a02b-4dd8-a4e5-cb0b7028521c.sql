-- Remove legacy anon-inclusive policies on storage.objects for 'fotos' and 'belege' buckets.
-- The authenticated-only equivalents already exist and remain in place.

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete" ON storage.objects;

-- Older naming variants seen in some setups
DROP POLICY IF EXISTS "Allow public read fotos" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload fotos" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete fotos" ON storage.objects;
DROP POLICY IF EXISTS "Public read belege" ON storage.objects;
DROP POLICY IF EXISTS "Public read fotos" ON storage.objects;