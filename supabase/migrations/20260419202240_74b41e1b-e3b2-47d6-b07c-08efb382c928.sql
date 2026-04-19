-- Bestehenden Rapport (inkl. zugehöriger Daten) löschen
DELETE FROM public.arbeitsrapporte;

-- Sequenz zurücksetzen, damit der nächste Auftrag wieder RAP-0001 erhält
ALTER SEQUENCE public.rapport_nummer_seq RESTART WITH 1;