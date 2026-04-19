import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle2, AlertTriangle, Circle } from "lucide-react";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  auftragsnummer: string | null;
  geplantes_datum: string;
  kategorie: string | null;
  arbeit_beschreibung: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  sicherheitscheck: Record<string, unknown> | null;
  // Snapshot Kunde
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  kunde_telefon: string | null;
  // Snapshot Fahrzeug
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
}

interface Props {
  rapport: Rapport;
}

const CHECK_LABELS: Record<string, string> = {
  bremsen: "Bremsen",
  beleuchtung: "Beleuchtung",
  reifen: "Reifen",
  fluessigkeiten: "Flüssigkeiten",
  unterboden: "Unterboden",
};

const STATUS_ICON: Record<string, JSX.Element> = {
  gruen: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  gelb: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  rot: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

export function RapportUebersicht({ rapport }: Props) {
  const checks = (rapport.sicherheitscheck as Record<string, string>) || {};

  return (
    <Card className="p-5 space-y-4 print:shadow-none print:border-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Rapport-Übersicht
          </div>
          <h2 className="text-xl font-bold">
            {rapport.rapport_nummer ?? "Rapport"}
            {rapport.auftragsnummer && (
              <span className="text-muted-foreground font-normal ml-2 text-base">
                · {rapport.auftragsnummer}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {new Date(rapport.geplantes_datum).toLocaleDateString("de-CH", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          className="print:hidden"
        >
          <Printer className="h-4 w-4 mr-1" /> Drucken
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Kunde</div>
          <div className="font-medium">{rapport.kunde_name ?? "—"}</div>
          {rapport.kundennummer && <div className="text-muted-foreground text-xs">Nr. {rapport.kundennummer}</div>}
          {rapport.kunde_ort && <div className="text-muted-foreground">{rapport.kunde_ort}</div>}
          {rapport.kunde_telefon && <div className="text-muted-foreground">{rapport.kunde_telefon}</div>}
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Fahrzeug</div>
          <div className="font-medium">{rapport.kennzeichen ?? "—"}</div>
          {(rapport.marke || rapport.modell) && (
            <div className="text-muted-foreground">
              {[rapport.marke, rapport.modell].filter(Boolean).join(" ")}
            </div>
          )}
          {rapport.chassis_nr && (
            <div className="text-muted-foreground text-xs">FIN: {rapport.chassis_nr}</div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Kategorie</div>
          <div>{rapport.kategorie ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Mechaniker</div>
          <div>{rapport.mechaniker_zuweisung ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Arbeitszeit</div>
          <div>{rapport.arbeitszeit_stunden ? `${rapport.arbeitszeit_stunden} h` : "—"}</div>
        </div>
      </div>

      {rapport.arbeit_beschreibung && (
        <div className="border-t border-border pt-3">
          <div className="text-xs text-muted-foreground mb-1">Ausgeführte Arbeiten</div>
          <p className="text-sm whitespace-pre-wrap">{rapport.arbeit_beschreibung}</p>
        </div>
      )}

      {Object.keys(checks).length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="text-xs text-muted-foreground mb-2">Sicherheitscheck</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(CHECK_LABELS).map(([key, label]) => {
              const v = checks[key] || "offen";
              return (
                <div key={key} className="flex items-center gap-2">
                  {STATUS_ICON[v] ?? <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rapport.notizen && (
        <div className="border-t border-border pt-3">
          <div className="text-xs text-muted-foreground mb-1">Notizen</div>
          <p className="text-sm whitespace-pre-wrap">{rapport.notizen}</p>
        </div>
      )}

      {rapport.auftragswert_chf != null && (
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Auftragswert</span>
          <span className="text-lg font-semibold">
            CHF {rapport.auftragswert_chf.toLocaleString("de-CH", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </Card>
  );
}
