import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, X, CheckCircle2, AlertTriangle, Circle } from "lucide-react";
import { kategorienLabels } from "@/lib/kategorien";
import {
  fzKennzeichen, fzMarke, fzModell, fzChassis,
  kdName, kdNummer, kdOrt, kdTelefon, kdStrasse, kdPlz,
  type FahrzeugRel,
} from "@/lib/rapport-relations";
import { usePositionenStore, type Position } from "@/stores/positionenStore";
import logoUrl from "@/assets/garage-brunner-logo.svg";

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

export interface RapportFieldVisibility {
  kunde: boolean;
  fahrzeug: boolean;
  meta: boolean;
  arbeiten: boolean;
  material: boolean;
  sicherheitscheck: boolean;
  notizen: boolean;
  auftragswert: boolean;
}

const ALL_VISIBLE: RapportFieldVisibility = {
  kunde: true, fahrzeug: true, meta: true, arbeiten: true,
  material: true, sicherheitscheck: true, notizen: true, auftragswert: true,
};

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

const CHECK_LABELS: Record<string, string> = {
  bremsen_vorne: "Bremsen vorne",
  bremsen_hinten: "Bremsen hinten",
  beleuchtung: "Beleuchtung",
  fluessigkeiten: "Flüssigkeiten",
  unterboden: "Unterboden / Auspuff",
};

function statusIcon(v: string) {
  if (v === "ok" || v === "gruen" || v === "gelb")
    return <CheckCircle2 className="h-3 w-3" style={{ color: "#10b981" }} />;
  if (v === "mangel" || v === "rot")
    return <AlertTriangle className="h-3 w-3" style={{ color: "#dc2626" }} />;
  return <Circle className="h-3 w-3" style={{ color: "#9ca3af" }} />;
}

export function DruckvorschauDialog({ open, onOpenChange, rapport }: Props) {
  const [visibility, setVisibility] = useState<RapportFieldVisibility>(ALL_VISIBLE);
  const subscribe = usePositionenStore((s) => s.subscribe);
  const positionen = usePositionenStore((s) => s.byRapport[rapport.id]?.positionen ?? []);

  useEffect(() => {
    if (open) return subscribe(rapport.id);
  }, [open, rapport.id, subscribe]);

  const toggle = (key: keyof RapportFieldVisibility) =>
    setVisibility((v) => ({ ...v, [key]: !v[key] }));

  const allOn = Object.values(visibility).every(Boolean);
  const setAll = (val: boolean) =>
    setVisibility(
      Object.fromEntries(FIELD_OPTIONS.map((o) => [o.key, val])) as unknown as RapportFieldVisibility
    );

  const checks = (rapport.sicherheitscheck as Record<string, string>) || {};
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
  const kundeStrasse = kdStrasse(rapport);
  const kundePlz = kdPlz(rapport);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="druckvorschau-dialog max-w-5xl w-[95vw] h-[92vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0 print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" /> Druckvorschau
          </DialogTitle>
        </DialogHeader>

        <div className="druckvorschau-body flex-1 grid md:grid-cols-[240px_1fr] overflow-hidden">
          <aside className="druckvorschau-sidebar border-b md:border-b-0 md:border-r border-border bg-muted/30 p-4 overflow-y-auto print:hidden">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Felder auswählen
            </div>
            <div className="space-y-2.5">
              {FIELD_OPTIONS.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer text-sm py-1.5">
                  <Checkbox
                    checked={visibility[opt.key]}
                    onCheckedChange={() => toggle(opt.key)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={() => setAll(!allOn)}>
                {allOn ? "Alle abwählen" : "Alle auswählen"}
              </Button>
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Drucken / PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-1" /> Schließen
              </Button>
            </div>
          </aside>

          {/* Vorschau (Bildschirm) + Druck-Container */}
          <div className="druckvorschau-preview overflow-y-auto bg-neutral-200 p-4">
            <div className="mx-auto" style={{ width: "210mm" }}>
              {/* PDF-Sheet: kompakt 1-Seite, helles Layout */}
              <div className="pdf-sheet bg-white text-black shadow-md mx-auto" style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "12mm 14mm",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: "10pt",
                lineHeight: 1.35,
                color: "#111",
                boxSizing: "border-box",
              }}>
                {/* Header mit Logo */}
                <header style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "2px solid #FFD100",
                  paddingBottom: "6mm",
                  marginBottom: "5mm",
                  gap: "8mm",
                }}>
                  <img
                    src={logoUrl}
                    alt="Garage Brunner"
                    style={{ height: "16mm", width: "auto", filter: "invert(1)" }}
                  />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14pt", fontWeight: 700, letterSpacing: "0.02em" }}>
                      Arbeitsrapport
                    </div>
                    <div style={{ fontSize: "10pt", color: "#444", marginTop: "1mm" }}>
                      Nr. {rapport.rapport_nummer ?? "—"}
                    </div>
                    <div style={{ fontSize: "9pt", color: "#666" }}>
                      {new Date(rapport.geplantes_datum).toLocaleDateString("de-CH", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                      })}
                    </div>
                  </div>
                </header>

                {/* Kunde + Fahrzeug nebeneinander */}
                {(visibility.kunde || visibility.fahrzeug) && (
                  <section style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6mm",
                    marginBottom: "4mm",
                  }}>
                    {visibility.kunde && (
                      <div style={{ border: "1px solid #e5e5e5", borderRadius: "2mm", padding: "3mm 4mm" }}>
                        <div style={pdfLabel}>Kunde</div>
                        <div style={{ fontWeight: 600 }}>{kundeName ?? "—"}</div>
                        {kundeNummer && <div style={pdfMuted}>Nr. {kundeNummer}</div>}
                        {kundeStrasse && <div style={pdfMuted}>{kundeStrasse}</div>}
                        {(kundePlz || kundeOrt) && (
                          <div style={pdfMuted}>{[kundePlz, kundeOrt].filter(Boolean).join(" ")}</div>
                        )}
                        {kundeTel && <div style={pdfMuted}>{kundeTel}</div>}
                      </div>
                    )}
                    {visibility.fahrzeug && (
                      <div style={{ border: "1px solid #e5e5e5", borderRadius: "2mm", padding: "3mm 4mm" }}>
                        <div style={pdfLabel}>Fahrzeug</div>
                        <div style={{ fontWeight: 600 }}>{kennzeichen ?? "—"}</div>
                        {(marke || modell) && (
                          <div style={pdfMuted}>{[marke, modell].filter(Boolean).join(" ")}</div>
                        )}
                        {chassis && <div style={pdfMuted}>FIN: {chassis}</div>}
                      </div>
                    )}
                  </section>
                )}

                {/* Meta-Zeile */}
                {visibility.meta && (
                  <section style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "4mm",
                    padding: "2.5mm 4mm",
                    background: "#f7f7f7",
                    borderRadius: "2mm",
                    marginBottom: "4mm",
                  }}>
                    <div>
                      <div style={pdfLabel}>Kategorie</div>
                      <div>{kategorienLabels(rapport.kategorie) || "—"}</div>
                    </div>
                    <div>
                      <div style={pdfLabel}>Mechaniker</div>
                      <div>{rapport.mechaniker_zuweisung ?? "—"}</div>
                    </div>
                    <div>
                      <div style={pdfLabel}>Arbeitszeit</div>
                      <div>{rapport.arbeitszeit_stunden ? `${rapport.arbeitszeit_stunden} h` : "—"}</div>
                    </div>
                  </section>
                )}

                {/* Arbeiten + Material nebeneinander für Kompaktheit */}
                {(visibility.arbeiten && arbeit.length > 0) || (visibility.material && material.length > 0) ? (
                  <section style={{
                    display: "grid",
                    gridTemplateColumns: visibility.arbeiten && visibility.material && arbeit.length > 0 && material.length > 0
                      ? "1.6fr 1fr" : "1fr",
                    gap: "5mm",
                    marginBottom: "4mm",
                  }}>
                    {visibility.arbeiten && arbeit.length > 0 && (
                      <div>
                        <div style={pdfSectionTitle}>Ausgeführte Arbeiten</div>
                        <ul style={pdfList}>
                          {arbeit.map((p) => (
                            <li key={p.id} style={pdfListItem}>
                              <span style={{
                                display: "inline-block",
                                width: "3.5mm", height: "3.5mm",
                                border: "1.2px solid #444",
                                borderRadius: "0.5mm",
                                marginRight: "2mm",
                                background: p.erledigt ? "#10b981" : "transparent",
                                position: "relative",
                                flexShrink: 0,
                                marginTop: "0.7mm",
                              }}>
                                {p.erledigt && (
                                  <span style={{
                                    position: "absolute",
                                    inset: 0,
                                    color: "white",
                                    fontSize: "8pt",
                                    lineHeight: "3.5mm",
                                    textAlign: "center",
                                    fontWeight: 700,
                                  }}>✓</span>
                                )}
                              </span>
                              <span style={{ flex: 1, color: p.erledigt ? "#111" : "#666" }}>
                                {p.beschreibung || "—"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {visibility.material && material.length > 0 && (
                      <div>
                        <div style={pdfSectionTitle}>Material</div>
                        <ul style={pdfList}>
                          {material.map((p) => (
                            <li key={p.id} style={{ ...pdfListItem, justifyContent: "space-between" }}>
                              <span style={{ flex: 1 }}>{p.beschreibung || "—"}</span>
                              <span style={{ fontVariantNumeric: "tabular-nums", color: "#555", fontSize: "9pt", marginLeft: "2mm" }}>
                                {fmtMenge(p)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                ) : null}

                {/* Sicherheitscheck */}
                {visibility.sicherheitscheck && Object.keys(checks).length > 0 && (
                  <section style={{ marginBottom: "4mm" }}>
                    <div style={pdfSectionTitle}>Sicherheitscheck</div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "1.5mm 5mm",
                    }}>
                      {Object.entries(CHECK_LABELS).map(([key, label]) => {
                        const v = (checks[key] as string) || "offen";
                        const bem = checks[`${key}_bemerkung`] as string | undefined;
                        return (
                          <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: "2mm" }}>
                            <span style={{ marginTop: "0.6mm" }}>{statusIcon(v)}</span>
                            <div style={{ flex: 1 }}>
                              <span>{label}</span>
                              {bem && (v === "mangel" || v === "rot") && (
                                <div style={{ fontSize: "8.5pt", color: "#dc2626", fontStyle: "italic" }}>
                                  {bem}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Notizen */}
                {visibility.notizen && rapport.notizen && (
                  <section style={{ marginBottom: "4mm" }}>
                    <div style={pdfSectionTitle}>Notizen</div>
                    <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "9.5pt" }}>
                      {rapport.notizen}
                    </p>
                  </section>
                )}

                {/* Auftragswert (am Fuß) */}
                {visibility.auftragswert && rapport.auftragswert_chf != null && (
                  <section style={{
                    marginTop: "auto",
                    paddingTop: "3mm",
                    borderTop: "1px solid #e5e5e5",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <span style={{ color: "#555" }}>Auftragswert</span>
                    <span style={{ fontSize: "13pt", fontWeight: 700 }}>
                      CHF {rapport.auftragswert_chf.toLocaleString("de-CH", { minimumFractionDigits: 2 })}
                    </span>
                  </section>
                )}

                {/* Footer */}
                <footer style={{
                  marginTop: "6mm",
                  paddingTop: "2.5mm",
                  borderTop: "1px solid #eee",
                  fontSize: "8pt",
                  color: "#888",
                  display: "flex",
                  justifyContent: "space-between",
                }}>
                  <span>Garage Brunner · Wynigen</span>
                  <span>Rapport {rapport.rapport_nummer ?? ""} · {new Date().toLocaleDateString("de-CH")}</span>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const pdfLabel: React.CSSProperties = {
  fontSize: "7.5pt",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#888",
  marginBottom: "1mm",
};

const pdfMuted: React.CSSProperties = {
  color: "#555",
  fontSize: "9pt",
};

const pdfSectionTitle: React.CSSProperties = {
  fontSize: "8.5pt",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#FFD100",
  fontWeight: 700,
  marginBottom: "1.8mm",
  paddingBottom: "1mm",
  borderBottom: "1.5px solid #111",
};

const pdfList: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "1.2mm",
};

const pdfListItem: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  fontSize: "9.5pt",
};
