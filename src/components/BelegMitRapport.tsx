import { BelegPreview } from "@/components/BelegPreview";
import { RapportUebersicht } from "@/components/RapportUebersicht";
import type { FahrzeugRel } from "@/lib/rapport-relations";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  pdf_url: string | null;
  geplantes_datum: string;
  kategorie: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  sicherheitscheck: Record<string, unknown> | null;
  fahrzeug?: FahrzeugRel | null;
}

interface Props {
  rapport: Rapport;
}

/**
 * Kombinierte Vorschau: Original-Beleg (PDF) zuerst, danach
 * Rapport-Übersicht mit Kunden-, Fahrzeug- und Arbeitsinformationen.
 */
export function BelegMitRapport({ rapport }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <BelegPreview pdfUrl={rapport.pdf_url} />
      <RapportUebersicht rapport={rapport} />
    </div>
  );
}
