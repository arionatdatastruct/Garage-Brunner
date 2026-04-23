-- 1) Spalte hinzufügen
ALTER TABLE public.arbeitsrapporte
  ADD COLUMN IF NOT EXISTS kunde_id uuid NULL REFERENCES public.kunden(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS arbeitsrapporte_kunde_id_idx
  ON public.arbeitsrapporte(kunde_id);

-- 2) Bestehende Rapporte einmalig auffüllen (über Fahrzeug → Kunde)
UPDATE public.arbeitsrapporte r
   SET kunde_id = f.kunde_id
  FROM public.fahrzeuge f
 WHERE r.fahrzeug_id = f.id
   AND r.kunde_id IS NULL
   AND f.kunde_id IS NOT NULL;

-- 3) Trigger: Beim Insert/Update Rapport → Kunde aus Fahrzeug ableiten
CREATE OR REPLACE FUNCTION public.rapport_auto_link_kunde()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.kunde_id IS NULL AND NEW.fahrzeug_id IS NOT NULL THEN
    SELECT kunde_id INTO NEW.kunde_id
      FROM public.fahrzeuge
     WHERE id = NEW.fahrzeug_id
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rapport_auto_link_kunde ON public.arbeitsrapporte;
CREATE TRIGGER trg_rapport_auto_link_kunde
  BEFORE INSERT OR UPDATE OF fahrzeug_id, kunde_id ON public.arbeitsrapporte
  FOR EACH ROW
  EXECUTE FUNCTION public.rapport_auto_link_kunde();

-- 4) Trigger: Wenn Fahrzeug einen Kunden bekommt, alle zugehörigen Rapporte ohne Kunde auffüllen
CREATE OR REPLACE FUNCTION public.fahrzeug_backfill_rapporte_kunde()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.kunde_id IS NOT NULL
     AND (OLD.kunde_id IS DISTINCT FROM NEW.kunde_id) THEN
    UPDATE public.arbeitsrapporte
       SET kunde_id = NEW.kunde_id
     WHERE fahrzeug_id = NEW.id
       AND kunde_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fahrzeug_backfill_rapporte_kunde ON public.fahrzeuge;
CREATE TRIGGER trg_fahrzeug_backfill_rapporte_kunde
  AFTER UPDATE OF kunde_id ON public.fahrzeuge
  FOR EACH ROW
  EXECUTE FUNCTION public.fahrzeug_backfill_rapporte_kunde();