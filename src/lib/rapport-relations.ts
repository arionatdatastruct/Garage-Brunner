/**
 * Zentrale Typen + Query-Helper für Rapport-Daten nach der 3NF-Migration.
 *
 * Snapshot-Spalten (kunde_*, kennzeichen, marke, modell, material_liste,
 * arbeit_beschreibung, auftragsnummer) existieren NICHT mehr in
 * `arbeitsrapporte`. Alle Konsumenten müssen über die JOIN-Felder
 * `fahrzeug:fahrzeuge(*, kunde:kunden(*))` lesen.
 *
 * Diese Datei stellt typsichere Interfaces + einen Query-Builder bereit,
 * damit Snapshot-Felder beim Build sofort als TS-Fehler auffallen.
 */

import { supabase } from "@/integrations/supabase/client";

// ---------- Basis-Entitäten (1:1 zu DB-Spalten) ----------

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

export interface FahrzeugRel {
  id: string;
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
  kunde?: KundeRel | null;
}

// ---------- Rapport-Status / Mechaniker (Enums aus DB) ----------

export type RapportStatus = "geplant" | "in_arbeit" | "erledigt" | "archiviert";
export type Mechaniker = "Roman" | "Pascal";

// ---------- Rapport-Varianten ----------

/** Minimaler Rapport mit eingebettetem Fahrzeug + Kunde. */
export interface RapportRel {
  id: string;
  fahrzeug_id?: string | null;
  fahrzeug?: FahrzeugRel | null;
}

/** Listen-Variante (für Wochenplan, Archiv, Statistiken-Aggregation). */
export interface RapportListItem extends RapportRel {
  rapport_nummer: string | null;
  status: RapportStatus;
  geplantes_datum: string;
  pdf_url: string | null;
  mechaniker_zuweisung: Mechaniker | null;
  arbeitszeit_stunden: number | null;
  auftragswert_chf: number | null;
  kategorie: string | null;
  created_at?: string;
}

/** Vollständiger Rapport (Detail-Ansicht). */
export interface RapportFull extends RapportListItem {
  notizen: string | null;
  fotos: string[] | null;
  sicherheitscheck: Record<string, unknown> | null;
  updated_at: string;
}

// ---------- Accessor-Helfer (defensiv, null-safe) ----------

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

// ---------- SELECT-Konstanten ----------

/** Vollständiger SELECT für Detail-Ansichten. */
export const RAPPORT_SELECT_FULL = `
  *,
  fahrzeug:fahrzeuge (
    id, kennzeichen, marke, modell, chassis_nr,
    kunde:kunden ( id, kundennummer, name, ort, strasse, plz, telefon, email )
  )
` as const;

/** Schlanker SELECT für Listen-Ansichten. */
export const RAPPORT_SELECT_LIST = `
  id, rapport_nummer, status, geplantes_datum, pdf_url,
  mechaniker_zuweisung, arbeitszeit_stunden, auftragswert_chf,
  kategorie, fahrzeug_id, created_at,
  fahrzeug:fahrzeuge (
    id, kennzeichen, marke, modell, chassis_nr,
    kunde:kunden ( id, kundennummer, name, ort, telefon )
  )
` as const;

// ---------- Reusable Query-Builder ----------

type QueryVariant = "list" | "full";

/**
 * Liefert ein vorkonfiguriertes Supabase-Query-Builder-Objekt für
 * `arbeitsrapporte`, inkl. JOIN auf `fahrzeuge` + `kunden`.
 *
 * Beispiel:
 *   const { data } = await selectRapporte("list")
 *     .eq("status", "geplant")
 *     .order("geplantes_datum");
 */
export function selectRapporte(variant: QueryVariant = "list") {
  const sel = variant === "full" ? RAPPORT_SELECT_FULL : RAPPORT_SELECT_LIST;
  // Cast nötig, weil die generierten DB-Typen die Snapshot-Spalten noch
  // referenzieren bzw. den dynamischen JOIN-String nicht eng typisieren.
  return (supabase as unknown as {
    from: (t: string) => { select: (s: string) => unknown };
  }).from("arbeitsrapporte").select(sel) as ReturnType<
    typeof supabase.from
  >["select"] extends (...a: unknown[]) => infer R
    ? R
    : never;
}
