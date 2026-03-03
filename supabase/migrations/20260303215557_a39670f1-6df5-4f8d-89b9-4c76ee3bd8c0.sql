
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated full access" ON public.fahrzeuge;
DROP POLICY IF EXISTS "Authenticated full access" ON public.arbeitsrapporte;

-- Create permissive policies for anon + authenticated
CREATE POLICY "Allow all access" ON public.fahrzeuge
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access" ON public.arbeitsrapporte
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
