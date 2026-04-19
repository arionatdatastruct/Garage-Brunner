import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, FileText, Wrench, Banknote } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

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

  // Monats-Umsatz (letzte 12 Monate)
  const monateUmsatz = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
    }
    for (const r of rows) {
      const key = r.geplantes_datum.slice(0, 7);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + (r.auftragswert_chf ?? 0));
    }
    return Array.from(map.entries()).map(([m, umsatz]) => {
      const [y, mo] = m.split("-");
      const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("de-CH", { month: "short", year: "2-digit" });
      return { monat: label, umsatz: Math.round(umsatz) };
    });
  }, [rows]);

  // Mechaniker-Vergleich
  const mechVergleich = useMemo(() => {
    const map = new Map<string, { mechaniker: string; stunden: number; umsatz: number }>();
    for (const r of rows) {
      const m = r.mechaniker_zuweisung;
      if (!m) continue;
      const ex = map.get(m) ?? { mechaniker: m, stunden: 0, umsatz: 0 };
      ex.stunden += r.arbeitszeit_stunden ?? 0;
      ex.umsatz += r.auftragswert_chf ?? 0;
      map.set(m, ex);
    }
    return Array.from(map.values()).map((x) => ({
      ...x,
      stunden: Math.round(x.stunden * 10) / 10,
      umsatz: Math.round(x.umsatz),
    }));
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
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Monats-Umsatz (12 Monate)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monateUmsatz}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="monat" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                  formatter={(v: number) => chf(v)}
                />
                <Bar dataKey="umsatz" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Mechaniker-Vergleich</CardTitle></CardHeader>
          <CardContent>
            {mechVergleich.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Noch keine Daten.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={mechVergleich}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mechaniker" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="stunden" name="Stunden" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="umsatz" name="Umsatz CHF" fill="hsl(var(--accent-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
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
                  {topKunden.slice(0, 50).map((k, i) => {
                    const slug = encodeURIComponent(k.kundennummer || k.kunde_name || k.key);
                    return (
                      <tr key={k.key} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-2">
                          <Link to={`/kunde/${slug}`} className="font-medium hover:text-primary hover:underline">
                            {k.kunde_name || "—"}
                          </Link>
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
                    );
                  })}
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
