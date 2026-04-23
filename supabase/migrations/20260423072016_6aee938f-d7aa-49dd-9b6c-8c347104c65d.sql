-- Auto-Verknüpfung Fahrzeug ↔ Kunde via Kundennummer
-- n8n schreibt Fahrzeug + Kunde unabhängig voneinander. Damit
-- fahrzeuge.kunde_id automatisch gefüllt wird, dient
-- fahrzeuge.kundennummer_hint als optionaler Match-String.

-- 1) Hint-Spalte (nullable, kein Default — nur wenn n8n explizit setzt)
ALTER TABLE public.fahrzeuge
  ADD COLUMN IF NOT EXISTS kundennummer_hint TEXT;

-- 2) Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_kunden_kundennummer
  ON public.kunden (kundennummer)
  WHERE kundennummer IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fahrzeuge_kundennummer_hint
  ON public.fahrzeuge (kundennummer_hint)
  WHERE kunde_id IS NULL AND kundennummer_hint IS NOT NULL;

-- 3) Trigger-Funktion: Beim INSERT/UPDATE eines Fahrzeugs
--    automatisch kunde_id setzen, falls Hint passt.
CREATE OR REPLACE FUNCTION public.fahrzeug_auto_link_kunde()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kunde_id IS NULL
     AND NEW.kundennummer_hint IS NOT NULL
     AND length(trim(NEW.kundennummer_hint)) > 0 THEN
    SELECT id
      INTO NEW.kunde_id
      FROM public.kunden
     WHERE kundennummer = trim(NEW.kundennummer_hint)
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fahrzeug_auto_link_kunde ON public.fahrzeuge;
CREATE TRIGGER trg_fahrzeug_auto_link_kunde
  BEFORE INSERT OR UPDATE OF kundennummer_hint, kunde_id
  ON public.fahrzeuge
  FOR EACH ROW
  EXECUTE FUNCTION public.fahrzeug_auto_link_kunde();

-- 4) Trigger-Funktion: Beim Anlegen/Update eines Kunden
--    rückwirkend alle wartenden Fahrzeuge verknüpfen
--    (deckt Race-Condition ab: Fahrzeug zuerst, Kunde später).
CREATE OR REPLACE FUNCTION public.kunde_backfill_fahrzeuge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kundennummer IS NOT NULL
     AND length(trim(NEW.kundennummer)) > 0 THEN
    UPDATE public.fahrzeuge
       SET kunde_id = NEW.id
     WHERE kunde_id IS NULL
       AND kundennummer_hint IS NOT NULL
       AND trim(kundennummer_hint) = trim(NEW.kundennummer);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kunde_backfill_fahrzeuge ON public.kunden;
CREATE TRIGGER trg_kunde_backfill_fahrzeuge
  AFTER INSERT OR UPDATE OF kundennummer
  ON public.kunden
  FOR EACH ROW
  EXECUTE FUNCTION public.kunde_backfill_fahrzeuge();

-- 5) Einmaliger Backfill für vorhandene Daten
UPDATE public.fahrzeuge f
   SET kunde_id = k.id
  FROM public.kunden k
 WHERE f.kunde_id IS NULL
   AND f.kundennummer_hint IS NOT NULL
   AND trim(f.kundennummer_hint) = trim(k.kundennummer);

COMMENT ON COLUMN public.fahrzeuge.kundennummer_hint IS
  'Optionale Kundennummer aus dem PDF/n8n. Trigger fahrzeug_auto_link_kunde verknüpft kunde_id automatisch.';