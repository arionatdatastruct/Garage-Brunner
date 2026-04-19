import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, FileText, Wrench, Banknote } from "lucide-react";
import { Link } from "react-router-dom";

interface Row {
  id: string;
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  auftragswert_chf: number | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: string | null;
  status: string;
  geplantes_datum: string;
}

interface KundenAgg {
  key: string;
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  anzahl: number;
  umsatz: number;
  letzterAuftragId: string;
  letztesDatum: string;
}

const chf = (n: number) =>
  "CHF " + n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Statistiken() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("arbeitsrapporte")
        .select("id, kundennummer, kunde_name, kunde_ort, auftragswert_chf, arbeitszeit_stunden, mechaniker_zuweisung, status, geplantes_datum")
        .order("geplantes_datum", { ascending: false })
        .limit(1000);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const kpis = useMemo(() => {
    const total = rows.length;
    const umsatz = rows.reduce((s, r) => s + (r.auftragswert_chf ?? 0), 0);
    const stunden = rows.reduce((s, r) => s + (r.arbeitszeit_stunden ?? 0), 0);
    const kunden = new Set(rows.map((r) => r.kundennummer || r.kunde_name).filter(Boolean)).size;
    return { total, umsatz, stunden, kunden };
  }, [rows]);

  const topKunden = useMemo<KundenAgg[]>(() => {
    const map = new Map<string, KundenAgg>();
    for (const r of rows) {
      const key = (r.kundennummer || r.kunde_name || "").trim();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.anzahl += 1;
        existing.umsatz += r.auftragswert_chf ?? 0;
        if (r.geplantes_datum > existing.letztesDatum) {
          existing.letztesDatum = r.geplantes_datum;
          existing.letzterAuftragId = r.id;
        }
      } else {
        map.set(key, {
          key,
          kundennummer: r.kundennummer,
          kunde_name: r.kunde_name,
          kunde_ort: r.kunde_ort,
          anzahl: 1,
          umsatz: r.auftragswert_chf ?? 0,
          letzterAuftragId: r.id,
          letztesDatum: r.geplantes_datum,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.umsatz - a.umsatz || b.anzahl - a.anzahl);
  }, [rows]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Lade Statistiken…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Statistiken</h1>
        <p className="text-sm text-muted-foreground">Übersicht aller erfassten Aufträge</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={FileText} label="Aufträge" value={kpis.total.toString()} />
        <KpiCard icon={Banknote} label="Umsatz" value={chf(kpis.umsatz)} />
        <KpiCard icon={Wrench} label="Stunden" value={kpis.stunden.toLocaleString("de-CH", { maximumFractionDigits: 1 }) + " h"} />
        <KpiCard icon={Users} label="Kunden" value={kpis.kunden.toString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top-Kunden</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topKunden.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Noch keine Daten.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">#</th>
                    <th className="text-left px-4 py-2 font-medium">Kunde</th>
                    <th className="text-right px-4 py-2 font-medium">Aufträge</th>
                    <th className="text-right px-4 py-2 font-medium">Umsatz</th>
                    <th className="text-right px-4 py-2 font-medium">Letzter</th>
                  </tr>
                </thead>
                <tbody>
                  {topKunden.slice(0, 50).map((k, i) => (
                    <tr key={k.key} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{k.kunde_name || "—"}</div>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          {k.kundennummer && <span className="font-mono">#{k.kundennummer}</span>}
                          {k.kunde_ort && <span>{k.kunde_ort}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{k.anzahl}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">{chf(k.umsatz)}</td>
                      <td className="px-4 py-2 text-right">
                        <Link to={`/auftrag/${k.letzterAuftragId}`} className="text-primary hover:underline text-xs">
                          {new Date(k.letztesDatum).toLocaleDateString("de-CH")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <div className="text-xl md:text-2xl font-bold font-mono mt-1 truncate">{value}</div>
      </CardContent>
    </Card>
  );
}
