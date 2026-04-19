-- Make buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('belege', 'fotos');

-- Drop existing public-read policies
DROP POLICY IF EXISTS "Public read belege" ON storage.objects;
DROP POLICY IF EXISTS "Public read fotos" ON storage.objects;

-- Authenticated read only
CREATE POLICY "Authenticated read belege"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'belege');

CREATE POLICY "Authenticated read fotos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fotos');