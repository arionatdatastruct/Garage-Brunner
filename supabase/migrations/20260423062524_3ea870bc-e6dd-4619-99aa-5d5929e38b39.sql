-- Enable Supabase Realtime for rapport_positionen + ensure full row payloads
ALTER TABLE public.rapport_positionen REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rapport_positionen'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.rapport_positionen';
  END IF;
END $$;

-- Backfill consistency: erledigt should be the single source of truth.
-- Any legacy "arbeit"-Zeile mit menge>0, aber erledigt=false → auf true setzen.
UPDATE public.rapport_positionen
SET erledigt = true
WHERE typ = 'arbeit'
  AND erledigt = false
  AND COALESCE(menge, 0) > 0;

-- Spiegel-Konstanz: bei "arbeit" soll menge die Checkbox abbilden (0/1),
-- damit Altcode/Exporte konsistent bleiben.
UPDATE public.rapport_positionen
SET menge = CASE WHEN erledigt THEN 1 ELSE 0 END
WHERE typ = 'arbeit'
  AND (menge IS DISTINCT FROM (CASE WHEN erledigt THEN 1 ELSE 0 END));