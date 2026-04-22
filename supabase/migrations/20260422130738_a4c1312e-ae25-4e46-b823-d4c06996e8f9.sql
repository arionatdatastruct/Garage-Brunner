-- 1. Daten löschen
TRUNCATE TABLE public.rapport_positionen, public.arbeitsrapporte, public.fahrzeuge, public.kunden RESTART IDENTITY CASCADE;

-- 2. Snapshot-Spalten aus arbeitsrapporte entfernen
ALTER TABLE public.arbeitsrapporte
  DROP COLUMN IF EXISTS kunde_name,
  DROP COLUMN IF EXISTS kunde_ort,
  DROP COLUMN IF EXISTS kunde_strasse,
  DROP COLUMN IF EXISTS kunde_plz,
  DROP COLUMN IF EXISTS kunde_telefon,
  DROP COLUMN IF EXISTS kunde_email,
  DROP COLUMN IF EXISTS kundennummer,
  DROP COLUMN IF EXISTS kennzeichen,
  DROP COLUMN IF EXISTS marke,
  DROP COLUMN IF EXISTS modell,
  DROP COLUMN IF EXISTS chassis_nr,
  DROP COLUMN IF EXISTS material_liste,
  DROP COLUMN IF EXISTS arbeit_beschreibung,
  DROP COLUMN IF EXISTS auftragsnummer;

-- 3. UNIQUE-Constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kunden_kundennummer_key') THEN
    ALTER TABLE public.kunden ADD CONSTRAINT kunden_kundennummer_key UNIQUE (kundennummer);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fahrzeuge_chassis_nr_key') THEN
    ALTER TABLE public.fahrzeuge ADD CONSTRAINT fahrzeuge_chassis_nr_key UNIQUE (chassis_nr);
  END IF;
END $$;

-- 4. Foreign Keys (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fahrzeuge_kunde_id_fkey') THEN
    ALTER TABLE public.fahrzeuge
      ADD CONSTRAINT fahrzeuge_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'arbeitsrapporte_fahrzeug_id_fkey') THEN
    ALTER TABLE public.arbeitsrapporte
      ADD CONSTRAINT arbeitsrapporte_fahrzeug_id_fkey FOREIGN KEY (fahrzeug_id) REFERENCES public.fahrzeuge(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rapport_positionen_rapport_id_fkey') THEN
    ALTER TABLE public.rapport_positionen
      ADD CONSTRAINT rapport_positionen_rapport_id_fkey FOREIGN KEY (rapport_id) REFERENCES public.arbeitsrapporte(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Indizes
CREATE INDEX IF NOT EXISTS idx_fahrzeuge_kennzeichen ON public.fahrzeuge (kennzeichen);
CREATE INDEX IF NOT EXISTS idx_fahrzeuge_kunde_id ON public.fahrzeuge (kunde_id);
CREATE INDEX IF NOT EXISTS idx_arbeitsrapporte_fahrzeug_id ON public.arbeitsrapporte (fahrzeug_id);
CREATE INDEX IF NOT EXISTS idx_arbeitsrapporte_geplantes_datum ON public.arbeitsrapporte (geplantes_datum);
CREATE INDEX IF NOT EXISTS idx_rapport_positionen_rapport_id ON public.rapport_positionen (rapport_id);

-- 6. Trigger: updated_at
DROP TRIGGER IF EXISTS update_kunden_updated_at ON public.kunden;
CREATE TRIGGER update_kunden_updated_at BEFORE UPDATE ON public.kunden
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_fahrzeuge_updated_at ON public.fahrzeuge;
CREATE TRIGGER update_fahrzeuge_updated_at BEFORE UPDATE ON public.fahrzeuge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_arbeitsrapporte_updated_at ON public.arbeitsrapporte;
CREATE TRIGGER update_arbeitsrapporte_updated_at BEFORE UPDATE ON public.arbeitsrapporte
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Trigger: rapport_nummer auto-generieren
DROP TRIGGER IF EXISTS set_rapport_nummer ON public.arbeitsrapporte;
CREATE TRIGGER set_rapport_nummer BEFORE INSERT ON public.arbeitsrapporte
  FOR EACH ROW EXECUTE FUNCTION public.generate_rapport_nummer();