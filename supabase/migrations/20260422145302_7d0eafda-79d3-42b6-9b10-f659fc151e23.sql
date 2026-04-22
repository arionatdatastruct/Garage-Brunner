-- Add explicit "erledigt" boolean column for work-position checklist.
-- Material positions continue to use menge + einheit; arbeit positions
-- now use the boolean and ignore menge/einheit at the UI layer.
ALTER TABLE public.rapport_positionen
  ADD COLUMN IF NOT EXISTS erledigt boolean NOT NULL DEFAULT false;

-- Backfill existing arbeit rows: menge > 0 → erledigt=true
UPDATE public.rapport_positionen
   SET erledigt = true
 WHERE typ = 'arbeit' AND COALESCE(menge, 0) > 0;