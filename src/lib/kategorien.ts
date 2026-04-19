// Zentrale Definition der Auftrags-Kategorien.
// Werden als kommaseparierter String aus IDs (z.B. "01,03") in der DB-Spalte
// `kategorie` (TEXT) abgelegt. Die führenden IDs erlauben eine stabile
// Auswertung in n8n (z.B. LIKE '%01%' oder Split nach Komma).

export interface Kategorie {
  id: string;
  label: string;
}

export const KATEGORIEN: Kategorie[] = [
  { id: "01", label: "Service" },
  { id: "02", label: "Reparatur" },
  { id: "03", label: "MFK" },
  { id: "04", label: "Reifen" },
  { id: "05", label: "Sonstiges" },
];

const ID_BY_LABEL = new Map(KATEGORIEN.map((k) => [k.label.toLowerCase(), k.id]));
const LABEL_BY_ID = new Map(KATEGORIEN.map((k) => [k.id, k.label]));

/** Parst einen Datenbankwert ("01,03" oder Legacy "Service,Reparatur") zu IDs. */
export function parseKategorien(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (LABEL_BY_ID.has(part)) return part; // bereits ID
      const mapped = ID_BY_LABEL.get(part.toLowerCase());
      return mapped ?? part; // unbekannte Werte unverändert durchreichen
    });
}

/** Serialisiert IDs zu DB-Wert. */
export function formatKategorien(ids: string[]): string | null {
  if (!ids.length) return null;
  // sortiert nach KATEGORIEN-Reihenfolge für konsistente Speicherung
  const order = new Map(KATEGORIEN.map((k, i) => [k.id, i]));
  return [...new Set(ids)]
    .sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99))
    .join(",");
}

/** Liefert lesbare Labels (z.B. "Service, MFK") aus DB-Wert. */
export function kategorienLabels(value: string | null | undefined): string {
  const ids = parseKategorien(value);
  if (!ids.length) return "";
  return ids.map((id) => LABEL_BY_ID.get(id) ?? id).join(", ");
}
