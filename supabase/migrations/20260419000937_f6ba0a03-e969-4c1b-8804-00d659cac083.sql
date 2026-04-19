ALTER TABLE public.arbeitsrapporte ADD COLUMN kundennummer text;
ALTER TABLE public.arbeitsrapporte DROP COLUMN IF EXISTS km_stand;
ALTER TABLE public.arbeitsrapporte DROP COLUMN IF EXISTS jahrgang;