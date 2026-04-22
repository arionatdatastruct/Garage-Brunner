import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle2, AlertTriangle, Circle, Wrench, Package } from "lucide-react";
import { kategorienLabels } from "@/lib/kategorien";
import { supabase } from "@/integrations/supabase/client";
import {
  fzKennzeichen, fzMarke, fzModell, fzChassis,
  kdName, kdNummer, kdOrt, kdTelefon,
  type FahrzeugRel,
} from "@/lib/rapport-relations";

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

interface Position {
  id: string;
  typ: "arbeit" | "material";
  beschreibung: string | null;
  menge: number | null;
  einheit: string | null;
  erledigt: boolean;
  sort_order: number;
}

interface Props {
  rapport: Rapport;
}

const CHECK_LABELS: Record<string, string> = {
  bremsen_vorne: "Bremsen vorne",
  bremsen_hinten: "Bremsen hinten",
  beleuchtung: "Beleuchtung",
  fluessigkeiten: "Flüssigkeiten",
  unterboden: "Unterboden / Auspuff",
};

function statusIcon(v: string) {
  if (v === "ok" || v === "gruen" || v === "gelb")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (v === "mangel" || v === "rot")
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

export function RapportUebersicht({ rapport }: Props) {
  const checks = (rapport.sicherheitscheck as Record<string, string>) || {};
  const [positionen, setPositionen] = useState<Position[]>([]);

  const loadPositionen = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("rapport_positionen")
      .select("id, typ, beschreibung, menge, einheit, erledigt, sort_order")
      .eq("rapport_id", rapport.id)
      .order("typ")
      .order("sort_order");

    setPositionen((data ?? []) as Position[]);
  }, [rapport.id]);

  useEffect(() => {
    void loadPositionen();

    const channel = supabase
      .channel(`rapport-positionen-${rapport.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rapport_positionen",
          filter: `rapport_id=eq.${rapport.id}`,
        },
        () => void loadPositionen(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rapport.id, loadPositionen]);

  const arbeit = positionen.filter((p) => p.typ === "arbeit");
  const material = positionen.filter((p) => p.typ === "material");

  const fmtMenge = (p: Position) =>
    `${p.menge ?? ""}${p.einheit ? " " + p.einheit : ""}`.trim();

  const kennzeichen = fzKennzeichen(rapport);
  const marke = fzMarke(rapport);
  const modell = fzModell(rapport);
  const chassis = fzChassis(rapport);
  const kundeName = kdName(rapport);
  const kundeNummer = kdNummer(rapport);
  const kundeOrt = kdOrt(rapport);
  const kundeTel = kdTelefon(rapport);

  return (
    <div className="preview-overlay">
      <Card className="p-5 space-y-4 print:shadow-none print:border-0 a4-paper preview-section">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Rapport-Übersicht
            </div>
            <h2 className="text-xl font-bold">
              {rapport.rapport_nummer ?? "Rapport"}
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
            <div className="font-medium">{kundeName ?? "—"}</div>
            {kundeNummer && (
              <div className="text-muted-foreground text-xs">Nr. {kundeNummer}</div>
            )}
            {kundeOrt && <div className="text-muted-foreground">{kundeOrt}</div>}
            {kundeTel && <div className="text-muted-foreground">{kundeTel}</div>}
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Fahrzeug</div>
            <div className="font-medium">{kennzeichen ?? "—"}</div>
            {(marke || modell) && (
              <div className="text-muted-foreground">
                {[marke, modell].filter(Boolean).join(" ")}
              </div>
            )}
            {chassis && (
              <div className="text-muted-foreground text-xs">FIN: {chassis}</div>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Kategorie</div>
            <div>{kategorienLabels(rapport.kategorie) || "—"}</div>
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

        {arbeit.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Wrench className="h-3 w-3" /> Ausgeführte Arbeiten
            </div>
            <ul className="space-y-1 text-sm">
              {arbeit.map((p) => {
                const done = !!p.erledigt;
                return (
                  <li key={p.id} className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={done ? "" : "text-muted-foreground"}>
                      {p.beschreibung || "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {material.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Package className="h-3 w-3" /> Material
            </div>
            <ul className="space-y-1 text-sm">
              {material.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-2">
                  <span>{p.beschreibung || "—"}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">
                    {fmtMenge(p)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(checks).length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="text-xs text-muted-foreground mb-2">Sicherheitscheck</div>
            <div className="space-y-1.5 text-sm">
              {Object.entries(CHECK_LABELS).map(([key, label]) => {
                const v = (checks[key] as string) || "offen";
                const bem = checks[`${key}_bemerkung`] as string | undefined;
                return (
                  <div key={key} className="flex items-start gap-2">
                    <span className="mt-0.5">{statusIcon(v)}</span>
                    <div className="flex-1">
                      <span>{label}</span>
                      {bem && (v === "mangel" || v === "rot") && (
                        <div className="text-xs text-red-500 mt-0.5 italic">{bem}</div>
                      )}
                    </div>
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
    </div>
  );
}
