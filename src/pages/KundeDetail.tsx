import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, FileText, ExternalLink, Banknote, Wrench, Car } from "lucide-react";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  auftragsnummer: string | null;
  status: string;
  geplantes_datum: string;
  pdf_url: string | null;
  mechaniker_zuweisung: string | null;
  arbeitszeit_stunden: number | null;
  auftragswert_chf: number | null;
  kategorie: string | null;
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  kunde_strasse: string | null;
  kunde_plz: string | null;
  kunde_telefon: string | null;
  kunde_email: string | null;
}

const chf = (n: number) =>
  "CHF " + n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function KundeDetail() {
  const { nummer } = useParams();
  const [rows, setRows] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nummer) return;
    (async () => {
      setLoading(true);
      // nummer kann echte Kundennummer ODER URL-encoded Name sein (Fallback)
      const decoded = decodeURIComponent(nummer);
      const { data } = await (supabase as any)
        .from("arbeitsrapporte")
        .select("*")
        .or(`kundennummer.eq.${decoded},kunde_name.eq.${decoded}`)
        .order("geplantes_datum", { ascending: false })
        .limit(500);
      setRows((data ?? []) as Rapport[]);
      setLoading(false);
    })();
  }, [nummer]);

  const kunde = rows[0];

  const stats = useMemo(() => {
    const umsatz = rows.reduce((s, r) => s + (r.auftragswert_chf ?? 0), 0);
    const stunden = rows.reduce((s, r) => s + (r.arbeitszeit_stunden ?? 0), 0);
    return { umsatz, stunden, anzahl: rows.length };
  }, [rows]);

  const fahrzeuge = useMemo(() => {
    const map = new Map<string, { kennzeichen: string; marke: string | null; modell: string | null; anzahl: number; letztes: string }>();
    for (const r of rows) {
      if (!r.kennzeichen) continue;
      const key = r.kennzeichen.toUpperCase();
      const ex = map.get(key);
      if (ex) {
        ex.anzahl += 1;
        if (r.geplantes_datum > ex.letztes) ex.letztes = r.geplantes_datum;
      } else {
        map.set(key, {
          kennzeichen: r.kennzeichen,
          marke: r.marke,
          modell: r.modell,
          anzahl: 1,
          letztes: r.geplantes_datum,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.anzahl - a.anzahl);
  }, [rows]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Lade Kunde…
      </div>
    );
  }

  if (!kunde) {
    return (
      <div className="p-6">
        <Link to="/statistiken" className="text-sm text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Zurück
        </Link>
        <p className="mt-4">Kunde nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <Link to="/statistiken" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Statistiken
        </Link>
        <h1 className="text-2xl font-bold mt-1">{kunde.kunde_name || "Kunde"}</h1>
        <div className="text-sm text-muted-foreground flex flex-wrap gap-2 mt-1">
          {kunde.kundennummer && <span className="font-mono">#{kunde.kundennummer}</span>}
          {kunde.kunde_strasse && <span>· {kunde.kunde_strasse}</span>}
          {(kunde.kunde_plz || kunde.kunde_ort) && (
            <span>· {[kunde.kunde_plz, kunde.kunde_ort].filter(Boolean).join(" ")}</span>
          )}
          {kunde.kunde_telefon && <span>· {kunde.kunde_telefon}</span>}
          {kunde.kunde_email && <span>· {kunde.kunde_email}</span>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Aufträge</div>
          <div className="text-2xl font-bold font-mono mt-1">{stats.anzahl}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Banknote className="h-3.5 w-3.5" /> Umsatz</div>
          <div className="text-2xl font-bold font-mono mt-1 truncate">{chf(stats.umsatz)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Wrench className="h-3.5 w-3.5" /> Stunden</div>
          <div className="text-2xl font-bold font-mono mt-1">{stats.stunden.toLocaleString("de-CH", { maximumFractionDigits: 1 })} h</div>
        </CardContent></Card>
      </div>

      {/* Fahrzeuge */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Fahrzeuge ({fahrzeuge.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {fahrzeuge.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Keine Fahrzeuge erfasst.</div>
          ) : (
            <div className="divide-y divide-border">
              {fahrzeuge.map((f) => (
                <div key={f.kennzeichen} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-mono font-semibold">{f.kennzeichen}</div>
                    <div className="text-xs text-muted-foreground">
                      {[f.marke, f.modell].filter(Boolean).join(" ") || "—"}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{f.anzahl} {f.anzahl === 1 ? "Auftrag" : "Aufträge"}</div>
                    <div>letzter: {new Date(f.letztes).toLocaleDateString("de-CH")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aufträge */}
      <Card>
        <CardHeader><CardTitle className="text-base">Aufträge</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Datum</th>
                  <th className="text-left px-3 py-2 font-medium">Nr.</th>
                  <th className="text-left px-3 py-2 font-medium">Fahrzeug</th>
                  <th className="text-left px-3 py-2 font-medium">Kategorie</th>
                  <th className="text-left px-3 py-2 font-medium">Mech.</th>
                  <th className="text-right px-3 py-2 font-medium">h</th>
                  <th className="text-right px-3 py-2 font-medium">CHF</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{new Date(r.geplantes_datum).toLocaleDateString("de-CH")}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.auftragsnummer || r.rapport_nummer || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="font-mono">{r.kennzeichen || "—"}</div>
                      <div className="text-xs text-muted-foreground">{[r.marke, r.modell].filter(Boolean).join(" ")}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.kategorie || "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.mechaniker_zuweisung || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{r.arbeitszeit_stunden ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.auftragswert_chf != null ? r.auftragswert_chf.toLocaleString("de-CH", { minimumFractionDigits: 2 }) : "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.status}</td>
                    <td className="px-3 py-2 text-right">
                      <Link to={`/auftrag/${r.id}`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
