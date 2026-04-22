/**
 * Hilfen, um nach der 3NF-Migration auf Daten aus den verknüpften Tabellen
 * (`fahrzeuge`, `kunden`) zuzugreifen, wenn die Snapshot-Spalten in
 * `arbeitsrapporte` nicht mehr existieren.
 *
 * Verwende den Standard-SELECT in `arbeitsrapporte`-Queries:
 *   *, fahrzeug:fahrzeuge ( *, kunde:kunden ( * ) )
 */

export interface FahrzeugRel {
  id: string;
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
  kunde?: KundeRel | null;
}

export interface KundeRel {
  id: string;
  kundennummer: string | null;
  name: string | null;
  ort: string | null;
  strasse: string | null;
  plz: string | null;
  telefon: string | null;
  email: string | null;
}

export interface RapportRel {
  fahrzeug?: FahrzeugRel | null;
  // Fallback: legacy-snapshot-felder werden von TS zugelassen, sind aber
  // nach der Migration immer undefined.
  [k: string]: any;
}

export const fzKennzeichen = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.kennzeichen ?? null;
export const fzMarke = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.marke ?? null;
export const fzModell = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.modell ?? null;
export const fzChassis = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.chassis_nr ?? null;

export const kdName = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.kunde?.name ?? null;
export const kdNummer = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.kunde?.kundennummer ?? null;
export const kdOrt = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.kunde?.ort ?? null;
export const kdTelefon = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.kunde?.telefon ?? null;
export const kdEmail = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.kunde?.email ?? null;
export const kdStrasse = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.kunde?.strasse ?? null;
export const kdPlz = (r: RapportRel | null | undefined) =>
  r?.fahrzeug?.kunde?.plz ?? null;

/** Standard-Select-String für Rapport-Listen mit eingebettetem Fahrzeug+Kunde. */
export const RAPPORT_SELECT_FULL = `
  *,
  fahrzeug:fahrzeuge (
    id, kennzeichen, marke, modell, chassis_nr,
    kunde:kunden ( id, kundennummer, name, ort, strasse, plz, telefon, email )
  )
`;

/** Schlanker Select für Listen-Ansichten (ohne *). */
export const RAPPORT_SELECT_LIST = `
  id, rapport_nummer, status, geplantes_datum, pdf_url,
  mechaniker_zuweisung, arbeitszeit_stunden, auftragswert_chf,
  kategorie, fahrzeug_id, created_at,
  fahrzeug:fahrzeuge (
    id, kennzeichen, marke, modell, chassis_nr,
    kunde:kunden ( id, kundennummer, name, ort, telefon )
  )
`;
