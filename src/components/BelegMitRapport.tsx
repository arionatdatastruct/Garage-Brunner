import { BelegPreview } from "@/components/BelegPreview";
import { RapportUebersicht } from "@/components/RapportUebersicht";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  auftragsnummer: string | null;
  pdf_url: string | null;
  geplantes_datum: string;
  kategorie: string | null;
  arbeit_beschreibung: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  sicherheitscheck: Record<string, unknown> | null;
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  kunde_telefon: string | null;
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
}

interface Props {
  rapport: Rapport;
}

/**
 * Kombinierte Vorschau: Original-Beleg (PDF) zuerst, danach
 * Rapport-Übersicht mit Kunden-, Fahrzeug- und Arbeitsinformationen.
 * Funktioniert sowohl auf Mobile als auch Desktop.
 */
export function BelegMitRapport({ rapport }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <BelegPreview pdfUrl={rapport.pdf_url} />
      <RapportUebersicht rapport={rapport} />
    </div>
  );
}
