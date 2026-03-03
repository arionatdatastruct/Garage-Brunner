
-- 1. Create kunden table (3NF normalization)
CREATE TABLE public.kunden (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  adresse text,
  telefon text,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.kunden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON public.kunden
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 2. Migrate existing customer data from fahrzeuge to kunden
INSERT INTO public.kunden (id, name, adresse, telefon, email)
SELECT DISTINCT ON (kunde_name, kunde_telefon)
  gen_random_uuid(),
  COALESCE(kunde_name, 'Unbekannt'),
  kunde_adresse,
  kunde_telefon,
  kunde_email
FROM public.fahrzeuge
WHERE kunde_name IS NOT NULL;

-- 3. Add kunde_id FK to fahrzeuge
ALTER TABLE public.fahrzeuge ADD COLUMN kunde_id uuid REFERENCES public.kunden(id);

-- 4. Link existing fahrzeuge to their kunden
UPDATE public.fahrzeuge f
SET kunde_id = k.id
FROM public.kunden k
WHERE COALESCE(f.kunde_name, 'Unbekannt') = k.name
  AND COALESCE(f.kunde_telefon, '') = COALESCE(k.telefon, '');

-- 5. Drop old customer columns from fahrzeuge
ALTER TABLE public.fahrzeuge
  DROP COLUMN kunde_name,
  DROP COLUMN kunde_telefon,
  DROP COLUMN kunde_adresse,
  DROP COLUMN kunde_email;

-- 6. Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true);

-- 7. Storage RLS policies
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'fotos');

CREATE POLICY "Allow upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'fotos');

CREATE POLICY "Allow delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'fotos');
