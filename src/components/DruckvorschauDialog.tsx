import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, X } from "lucide-react";
import {
  RapportUebersicht,
  type RapportFieldVisibility,
  ALL_FIELDS_VISIBLE,
} from "@/components/RapportUebersicht";
import type { FahrzeugRel } from "@/lib/rapport-relations";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rapport: Rapport;
}

const FIELD_OPTIONS: Array<{ key: keyof RapportFieldVisibility; label: string }> = [
  { key: "kunde", label: "Kunde" },
  { key: "fahrzeug", label: "Fahrzeug" },
  { key: "meta", label: "Kategorie / Mechaniker / Zeit" },
  { key: "arbeiten", label: "Ausgeführte Arbeiten" },
  { key: "material", label: "Material" },
  { key: "sicherheitscheck", label: "Sicherheitscheck" },
  { key: "notizen", label: "Notizen" },
  { key: "auftragswert", label: "Auftragswert" },
];

export function DruckvorschauDialog({ open, onOpenChange, rapport }: Props) {
  const [visibility, setVisibility] = useState<RapportFieldVisibility>(ALL_FIELDS_VISIBLE);

  const toggle = (key: keyof RapportFieldVisibility) =>
    setVisibility((v) => ({ ...v, [key]: !v[key] }));

  const allOn = Object.values(visibility).every(Boolean);
  const setAll = (val: boolean) =>
    setVisibility(
      Object.fromEntries(FIELD_OPTIONS.map((o) => [o.key, val])) as unknown as RapportFieldVisibility
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0 print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" /> Druckvorschau
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid md:grid-cols-[260px_1fr] overflow-hidden">
          {/* Field selector — hidden on print */}
          <aside className="border-b md:border-b-0 md:border-r border-border bg-muted/30 p-4 overflow-y-auto print:hidden">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Felder auswählen
            </div>
            <div className="space-y-2.5">
              {FIELD_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2.5 cursor-pointer text-sm py-1.5"
                >
                  <Checkbox
                    checked={visibility[opt.key]}
                    onCheckedChange={() => toggle(opt.key)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAll(!allOn)}
              >
                {allOn ? "Alle abwählen" : "Alle auswählen"}
              </Button>
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Drucken / PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 mr-1" /> Schließen
              </Button>
            </div>
          </aside>

          {/* Preview */}
          <div className="overflow-y-auto bg-muted/10 p-4">
            <div className="mx-auto max-w-3xl">
              <RapportUebersicht
                rapport={rapport}
                visibility={visibility}
                hidePrintButton
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
