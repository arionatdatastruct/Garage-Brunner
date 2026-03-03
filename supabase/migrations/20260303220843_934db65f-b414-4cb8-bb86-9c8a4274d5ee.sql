
-- Add rapport_nummer column
ALTER TABLE public.arbeitsrapporte 
ADD COLUMN IF NOT EXISTS rapport_nummer text;

-- Create sequence for rapport numbers
CREATE SEQUENCE IF NOT EXISTS rapport_nummer_seq START 1;

-- Create trigger function to auto-generate rapport number
CREATE OR REPLACE FUNCTION public.generate_rapport_nummer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.rapport_nummer := 'RAP-' || LPAD(nextval('rapport_nummer_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_rapport_nummer ON public.arbeitsrapporte;
CREATE TRIGGER set_rapport_nummer
  BEFORE INSERT ON public.arbeitsrapporte
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_rapport_nummer();
