-- Tighten arbeitsrapporte: only authenticated users (anon-signin counts) can read/write.
-- Service role (used by n8n) bypasses RLS automatically.
DROP POLICY IF EXISTS "Allow all access" ON public.arbeitsrapporte;

CREATE POLICY "Authenticated users can view rapporte"
ON public.arbeitsrapporte FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert rapporte"
ON public.arbeitsrapporte FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update rapporte"
ON public.arbeitsrapporte FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rapporte"
ON public.arbeitsrapporte FOR DELETE
TO authenticated
USING (true);

-- Storage: belege + fotos buckets — public READ stays (für PDF/Foto-Vorschau via Public-URL),
-- aber INSERT/UPDATE/DELETE nur authenticated.
-- Drop bestehende offene Policies (Namen können variieren, daher defensiv)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname ILIKE ANY (ARRAY['%belege%','%fotos%'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Public read (für Public-URLs in der App)
CREATE POLICY "Public read belege"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'belege');

CREATE POLICY "Public read fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'fotos');

-- Authenticated write
CREATE POLICY "Authenticated insert belege"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'belege');

CREATE POLICY "Authenticated update belege"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'belege');

CREATE POLICY "Authenticated delete belege"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'belege');

CREATE POLICY "Authenticated insert fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fotos');

CREATE POLICY "Authenticated update fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'fotos');

CREATE POLICY "Authenticated delete fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fotos');