
ALTER TABLE public.fahrzeuge 
ADD COLUMN IF NOT EXISTS jahrgang text,
ADD COLUMN IF NOT EXISTS kunde_adresse text,
ADD COLUMN IF NOT EXISTS kunde_email text;

ALTER TABLE public.arbeitsrapporte 
ADD COLUMN IF NOT EXISTS mechaniker text,
ADD COLUMN IF NOT EXISTS reifen_zustand text;
