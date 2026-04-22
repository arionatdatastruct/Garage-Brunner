-- ============================================================
-- Migration 1+2: Normalisierung (3NF) — kunden, fahrzeuge, rapport_positionen
-- + Datenkopie aus bestehenden arbeitsrapporte-Snapshots (idempotent)
-- Snapshot-Spalten bleiben als Fallback bis n8n umgestellt ist.
-- ============================================================

-- 1. KUNDEN
CREATE TABLE IF NOT EXISTS public.kunden (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kundennummer text UNIQUE,
  name text,
  strasse text,
  plz text,
  ort text,
  telefon text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kunden ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view kunden" ON public.kunden;
CREATE POLICY "Authenticated users can view kunden" ON public.kunden FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert kunden" ON public.kunden;
CREATE POLICY "Authenticated users can insert kunden" ON public.kunden FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update kunden" ON public.kunden;
CREATE POLICY "Authenticated users can update kunden" ON public.kunden FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can delete kunden" ON public.kunden;
CREATE POLICY "Authenticated users can delete kunden" ON public.kunden FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS update_kunden_updated_at ON public.kunden;
CREATE TRIGGER update_kunden_updated_at BEFORE UPDATE ON public.kunden
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. FAHRZEUGE
CREATE TABLE IF NOT EXISTS public.fahrzeuge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chassis_nr text UNIQUE,
  kennzeichen text,
  marke text,
  modell text,
  kunde_id uuid REFERENCES public.kunden(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fahrzeuge_kennzeichen ON public.fahrzeuge(kennzeichen);
CREATE INDEX IF NOT EXISTS idx_fahrzeuge_kunde_id ON public.fahrzeuge(kunde_id);

ALTER TABLE public.fahrzeuge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view fahrzeuge" ON public.fahrzeuge;
CREATE POLICY "Authenticated users can view fahrzeuge" ON public.fahrzeuge FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert fahrzeuge" ON public.fahrzeuge;
CREATE POLICY "Authenticated users can insert fahrzeuge" ON public.fahrzeuge FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update fahrzeuge" ON public.fahrzeuge;
CREATE POLICY "Authenticated users can update fahrzeuge" ON public.fahrzeuge FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can delete fahrzeuge" ON public.fahrzeuge;
CREATE POLICY "Authenticated users can delete fahrzeuge" ON public.fahrzeuge FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS update_fahrzeuge_updated_at ON public.fahrzeuge;
CREATE TRIGGER update_fahrzeuge_updated_at BEFORE UPDATE ON public.fahrzeuge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. ARBEITSRAPPORTE: fahrzeug_id hinzufügen (Snapshots bleiben!)
ALTER TABLE public.arbeitsrapporte
  ADD COLUMN IF NOT EXISTS fahrzeug_id uuid REFERENCES public.fahrzeuge(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_arbeitsrapporte_fahrzeug_id ON public.arbeitsrapporte(fahrzeug_id);

-- 4. RAPPORT_POSITIONEN
CREATE TABLE IF NOT EXISTS public.rapport_positionen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rapport_id uuid NOT NULL REFERENCES public.arbeitsrapporte(id) ON DELETE CASCADE,
  typ text NOT NULL CHECK (typ IN ('arbeit','material')),
  beschreibung text,
  menge numeric,
  einheit text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rapport_positionen_rapport_id ON public.rapport_positionen(rapport_id);
CREATE INDEX IF NOT EXISTS idx_rapport_positionen_typ ON public.rapport_positionen(typ);

ALTER TABLE public.rapport_positionen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view positionen" ON public.rapport_positionen;
CREATE POLICY "Authenticated users can view positionen" ON public.rapport_positionen FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert positionen" ON public.rapport_positionen;
CREATE POLICY "Authenticated users can insert positionen" ON public.rapport_positionen FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update positionen" ON public.rapport_positionen;
CREATE POLICY "Authenticated users can update positionen" ON public.rapport_positionen FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can delete positionen" ON public.rapport_positionen;
CREATE POLICY "Authenticated users can delete positionen" ON public.rapport_positionen FOR DELETE TO authenticated USING (true);

-- ============================================================
-- DATENKOPIE (idempotent)
-- ============================================================

-- Kunden aus Snapshots (dedupliziert per kundennummer)
INSERT INTO public.kunden (kundennummer, name, strasse, plz, ort, telefon, email)
SELECT DISTINCT ON (kundennummer)
  kundennummer, kunde_name, kunde_strasse, kunde_plz, kunde_ort, kunde_telefon, kunde_email
FROM public.arbeitsrapporte
WHERE kundennummer IS NOT NULL AND kundennummer <> ''
ORDER BY kundennummer, updated_at DESC
ON CONFLICT (kundennummer) DO NOTHING;

-- Fahrzeuge aus Snapshots (dedupliziert per chassis_nr wenn vorhanden, sonst per kennzeichen)
-- Variante A: mit chassis_nr
INSERT INTO public.fahrzeuge (chassis_nr, kennzeichen, marke, modell, kunde_id)
SELECT DISTINCT ON (a.chassis_nr)
  a.chassis_nr, a.kennzeichen, a.marke, a.modell, k.id
FROM public.arbeitsrapporte a
LEFT JOIN public.kunden k ON k.kundennummer = a.kundennummer
WHERE a.chassis_nr IS NOT NULL AND a.chassis_nr <> ''
ORDER BY a.chassis_nr, a.updated_at DESC
ON CONFLICT (chassis_nr) DO NOTHING;

-- Variante B: ohne chassis_nr — nur per kennzeichen, falls noch nicht angelegt
INSERT INTO public.fahrzeuge (kennzeichen, marke, modell, kunde_id)
SELECT DISTINCT ON (a.kennzeichen)
  a.kennzeichen, a.marke, a.modell, k.id
FROM public.arbeitsrapporte a
LEFT JOIN public.kunden k ON k.kundennummer = a.kundennummer
WHERE a.kennzeichen IS NOT NULL AND a.kennzeichen <> ''
  AND (a.chassis_nr IS NULL OR a.chassis_nr = '')
  AND NOT EXISTS (
    SELECT 1 FROM public.fahrzeuge f WHERE f.kennzeichen = a.kennzeichen
  )
ORDER BY a.kennzeichen, a.updated_at DESC;

-- arbeitsrapporte.fahrzeug_id setzen (idempotent)
UPDATE public.arbeitsrapporte a
SET fahrzeug_id = f.id
FROM public.fahrzeuge f
WHERE a.fahrzeug_id IS NULL
  AND (
    (a.chassis_nr IS NOT NULL AND a.chassis_nr <> '' AND f.chassis_nr = a.chassis_nr)
    OR (
      (a.chassis_nr IS NULL OR a.chassis_nr = '')
      AND a.kennzeichen IS NOT NULL AND a.kennzeichen <> ''
      AND f.kennzeichen = a.kennzeichen
    )
  );

-- material_liste JSONB → rapport_positionen typ='material'
-- Idempotent: nur einfügen wenn für diesen Rapport noch keine Material-Positionen existieren
INSERT INTO public.rapport_positionen (rapport_id, typ, beschreibung, menge, einheit, sort_order)
SELECT
  a.id,
  'material',
  COALESCE(item->>'artikel', item->>'name', item->>'beschreibung', ''),
  NULLIF(regexp_replace(COALESCE(item->>'menge', item->>'anzahl', '1'), '[^0-9.,]', '', 'g'), '')::numeric,
  COALESCE(item->>'einheit', 'Stk'),
  ord.idx
FROM public.arbeitsrapporte a
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(a.material_liste) = 'array' THEN a.material_liste ELSE '[]'::jsonb END
) WITH ORDINALITY AS ord(item, idx)
WHERE jsonb_typeof(a.material_liste) = 'array'
  AND jsonb_array_length(a.material_liste) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.rapport_positionen p WHERE p.rapport_id = a.id AND p.typ = 'material'
  );

-- arbeit_beschreibung Text → rapport_positionen typ='arbeit' (eine Zeile pro Rapport)
INSERT INTO public.rapport_positionen (rapport_id, typ, beschreibung, menge, einheit, sort_order)
SELECT
  a.id,
  'arbeit',
  a.arbeit_beschreibung,
  COALESCE(a.arbeitszeit_stunden, 1),
  'Std',
  0
FROM public.arbeitsrapporte a
WHERE a.arbeit_beschreibung IS NOT NULL
  AND trim(a.arbeit_beschreibung) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.rapport_positionen p WHERE p.rapport_id = a.id AND p.typ = 'arbeit'
  );