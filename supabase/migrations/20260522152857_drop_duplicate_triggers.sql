-- Drop duplicate triggers on public.arbeitsrapporte.
--
-- Two pairs of triggers were both firing the same function for every insert /
-- update; the canonical names (matching the convention used on fahrzeuge and
-- kunden) are kept and the duplicates removed.
--
-- Keep:
--   set_rapport_nummer                BEFORE INSERT -> generate_rapport_nummer()
--   update_arbeitsrapporte_updated_at BEFORE UPDATE -> update_updated_at_column()
-- Drop:
--   trg_arbeitsrapporte_nummer        BEFORE INSERT -> generate_rapport_nummer()  (dup of set_rapport_nummer)
--   trg_arbeitsrapporte_updated       BEFORE UPDATE -> update_updated_at_column() (dup of update_arbeitsrapporte_updated_at)

drop trigger if exists trg_arbeitsrapporte_nummer  on public.arbeitsrapporte;
drop trigger if exists trg_arbeitsrapporte_updated on public.arbeitsrapporte;
