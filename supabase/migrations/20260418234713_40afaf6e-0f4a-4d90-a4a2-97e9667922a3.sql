-- 1a. Neue Spalten an arbeitsrapporte
ALTER TABLE public.arbeitsrapporte
  ADD COLUMN IF NOT EXISTS kunde_name text,
  ADD COLUMN IF NOT EXISTS kunde_ort text,
  ADD COLUMN IF NOT EXISTS kunde_strasse text,
  ADD COLUMN IF NOT EXISTS kunde_plz text,
  ADD COLUMN IF NOT EXISTS kunde_telefon text,
  ADD COLUMN IF NOT EXISTS kunde_email text,
  ADD COLUMN IF NOT EXISTS kennzeichen text,
  ADD COLUMN IF NOT EXISTS marke text,
  ADD COLUMN IF NOT EXISTS modell text,
  ADD COLUMN IF NOT EXISTS jahrgang text,
  ADD COLUMN IF NOT EXISTS chassis_nr text;

-- 1b. Backfill aus fahrzeuge + kunden
UPDATE public.arbeitsrapporte r
SET
  kennzeichen = f.kennzeichen,
  marke       = f.marke,
  modell      = f.modell,
  jahrgang    = f.jahrgang,
  chassis_nr  = f.chassis_nr,
  kunde_name  = k.name,
  kunde_ort   = k.ort,
  kunde_strasse = k.adresse,
  kunde_telefon = k.telefon,
  kunde_email   = k.email
FROM public.fahrzeuge f
LEFT JOIN public.kunden k ON k.id = f.kunde_id
WHERE r.fahrzeug_id = f.id;

-- Platzhalter-Namen wegputzen
UPDATE public.arbeitsrapporte
SET kunde_name = NULL
WHERE kunde_name = '(wird ergänzt)';

UPDATE public.arbeitsrapporte
SET kennzeichen = NULL
WHERE kennzeichen LIKE 'TMP-%';

-- 1c. Unnötige Spalten droppen
ALTER TABLE public.arbeitsrapporte
  DROP COLUMN IF EXISTS datum,
  DROP COLUMN IF EXISTS mechaniker,
  DROP COLUMN IF EXISTS reifen_zustand,
  DROP COLUMN IF EXISTS naechster_service_datum,
  DROP COLUMN IF EXISTS naechster_service_km,
  DROP COLUMN IF EXISTS mfk_datum,
  DROP COLUMN IF EXISTS ampel_status,
  DROP COLUMN IF EXISTS fahrzeug_id;

-- 1d. Alte Tabellen löschen
DROP TABLE IF EXISTS public.fahrzeuge CASCADE;
DROP TABLE IF EXISTS public.kunden CASCADE;

-- 1e. Indizes
CREATE INDEX IF NOT EXISTS idx_rapporte_kennzeichen
  ON public.arbeitsrapporte (kennzeichen);
CREATE INDEX IF NOT EXISTS idx_rapporte_datum_status
  ON public.arbeitsrapporte (geplantes_datum, status);