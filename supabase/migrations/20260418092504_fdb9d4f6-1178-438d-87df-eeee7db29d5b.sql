-- Tabellen löschen
DROP TABLE IF EXISTS public.arbeitsrapporte CASCADE;
DROP TABLE IF EXISTS public.fahrzeuge CASCADE;
DROP TABLE IF EXISTS public.kunden CASCADE;
DROP SEQUENCE IF EXISTS public.rapport_nummer_seq CASCADE;
DROP FUNCTION IF EXISTS public.generate_rapport_nummer() CASCADE;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.rapport_status AS ENUM ('geplant','in_arbeit','erledigt','archiviert');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.mechaniker_name AS ENUM ('Roman','Pascal');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Kunden
CREATE TABLE public.kunden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  adresse TEXT, telefon TEXT, email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kunden ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.kunden FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_kunden_updated BEFORE UPDATE ON public.kunden
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fahrzeuge
CREATE TABLE public.fahrzeuge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id UUID REFERENCES public.kunden(id) ON DELETE SET NULL,
  kennzeichen TEXT NOT NULL,
  marke TEXT, modell TEXT, jahrgang TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fahrzeuge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.fahrzeuge FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fahrzeuge_updated BEFORE UPDATE ON public.fahrzeuge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fahrzeuge_kennzeichen ON public.fahrzeuge(kennzeichen);

-- Sequence + Trigger für RAP-XXXX
CREATE SEQUENCE public.rapport_nummer_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_rapport_nummer()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rapport_nummer IS NULL THEN
    NEW.rapport_nummer := 'RAP-' || LPAD(nextval('public.rapport_nummer_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

-- Arbeitsrapporte
CREATE TABLE public.arbeitsrapporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapport_nummer TEXT UNIQUE,
  auftragsnummer TEXT,
  fahrzeug_id UUID REFERENCES public.fahrzeuge(id) ON DELETE CASCADE,
  status public.rapport_status NOT NULL DEFAULT 'geplant',
  mechaniker_zuweisung public.mechaniker_name,
  geplantes_datum DATE NOT NULL DEFAULT CURRENT_DATE,
  pdf_url TEXT,
  auftragswert_chf NUMERIC(10,2),
  datum DATE DEFAULT CURRENT_DATE,
  km_stand INTEGER,
  kategorie TEXT,
  arbeit_beschreibung TEXT,
  material_liste JSONB DEFAULT '[]'::jsonb,
  sicherheitscheck JSONB DEFAULT '{}'::jsonb,
  arbeitszeit_stunden NUMERIC(5,2),
  mechaniker TEXT,
  reifen_zustand TEXT,
  naechster_service_datum DATE,
  naechster_service_km INTEGER,
  mfk_datum DATE,
  notizen TEXT,
  fotos TEXT[] DEFAULT '{}'::text[],
  ampel_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.arbeitsrapporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.arbeitsrapporte FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_arbeitsrapporte_nummer BEFORE INSERT ON public.arbeitsrapporte
  FOR EACH ROW EXECUTE FUNCTION public.generate_rapport_nummer();
CREATE TRIGGER trg_arbeitsrapporte_updated BEFORE UPDATE ON public.arbeitsrapporte
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_arbeitsrapporte_status ON public.arbeitsrapporte(status);
CREATE INDEX idx_arbeitsrapporte_geplantes_datum ON public.arbeitsrapporte(geplantes_datum);
CREATE INDEX idx_arbeitsrapporte_auftragsnummer ON public.arbeitsrapporte(auftragsnummer);

-- Storage Bucket belege (fotos existiert bereits)
INSERT INTO storage.buckets (id, name, public)
VALUES ('belege','belege', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
DROP POLICY IF EXISTS "Public read belege" ON storage.objects;
DROP POLICY IF EXISTS "Public write belege" ON storage.objects;
DROP POLICY IF EXISTS "Public update belege" ON storage.objects;
DROP POLICY IF EXISTS "Public delete belege" ON storage.objects;
CREATE POLICY "Public read belege" ON storage.objects FOR SELECT USING (bucket_id = 'belege');
CREATE POLICY "Public write belege" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'belege');
CREATE POLICY "Public update belege" ON storage.objects FOR UPDATE USING (bucket_id = 'belege');
CREATE POLICY "Public delete belege" ON storage.objects FOR DELETE USING (bucket_id = 'belege');

DROP POLICY IF EXISTS "Public read fotos" ON storage.objects;
DROP POLICY IF EXISTS "Public write fotos" ON storage.objects;
DROP POLICY IF EXISTS "Public update fotos" ON storage.objects;
DROP POLICY IF EXISTS "Public delete fotos" ON storage.objects;
CREATE POLICY "Public read fotos" ON storage.objects FOR SELECT USING (bucket_id = 'fotos');
CREATE POLICY "Public write fotos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fotos');
CREATE POLICY "Public update fotos" ON storage.objects FOR UPDATE USING (bucket_id = 'fotos');
CREATE POLICY "Public delete fotos" ON storage.objects FOR DELETE USING (bucket_id = 'fotos');