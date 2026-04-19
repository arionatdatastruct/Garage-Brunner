import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, FileText, Wrench, Banknote, TrendingUp, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { KATEGORIEN, parseKategorien } from "@/lib/kategorien";
import { kapazitaetFuer } from "@/lib/arbeitszeiten";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  auftragswert_chf: number | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: string | null;
  kategorie: string | null;
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

const chfShort = (n: number) =>
  n >= 1000 ? `${(n / 1000).toLocaleString("de-CH", { maximumFractionDigits: 1 })}k` : n.toFixed(0);

export default function Statistiken() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("arbeitsrapporte")
        .select("id, kundennummer, kunde_name, kunde_ort, auftragswert_chf, arbeitszeit_stunden, mechaniker_zuweisung, kategorie, status, geplantes_datum")
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

  const mechAuslastung = useMemo(() => {
    const map = new Map<string, { mechaniker: string; verplant: number; tage: Set<string> }>();
    for (const r of rows) {
      const m = r.mechaniker_zuweisung;
      if (!m) continue;
      if (r.status !== "geplant" && r.status !== "in_arbeit") continue;
      const ex = map.get(m) ?? { mechaniker: m, verplant: 0, tage: new Set<string>() };
      ex.verplant += r.arbeitszeit_stunden ?? 0;
      ex.tage.add(r.geplantes_datum);
      map.set(m, ex);
    }
    return Array.from(map.values()).map((x) => {
      const kap = Array.from(x.tage).reduce((s, d) => s + kapazitaetFuer(d), 0);
      const pct = kap > 0 ? Math.round((x.verplant / kap) * 100) : 0;
      return {
        mechaniker: x.mechaniker,
        verplant: Math.round(x.verplant * 10) / 10,
        kapazitaet: kap,
        auslastung: pct,
      };
    });
  }, [rows]);

  const kategorieVergleich = useMemo(() => {
    const map = new Map<string, { id: string; label: string; umsatz: number; anzahl: number }>();
    for (const k of KATEGORIEN) {
      map.set(k.id, { id: k.id, label: k.label, umsatz: 0, anzahl: 0 });
    }
    for (const r of rows) {
      const ids = parseKategorien(r.kategorie);
      if (ids.length === 0) continue;
      for (const id of ids) {
        const ex = map.get(id);
        if (!ex) continue;
        ex.umsatz += r.auftragswert_chf ?? 0;
        ex.anzahl += 1;
      }
    }
    return Array.from(map.values()).map((x) => ({ ...x, umsatz: Math.round(x.umsatz) }));
  }, [rows]);

  const aktuellerMonat = monateUmsatz[monateUmsatz.length - 1]?.umsatz ?? 0;
  const vorMonat = monateUmsatz[monateUmsatz.length - 2]?.umsatz ?? 0;
  const trendPct = vorMonat > 0 ? Math.round(((aktuellerMonat - vorMonat) / vorMonat) * 100) : null;

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Lade Statistiken…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Statistiken</h1>
        <p className="text-sm text-muted-foreground mt-1">Übersicht aller erfassten Aufträge</p>
      </div>

      {/* Hero KPI */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card/50 to-card p-6 md:p-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-[0.12em] font-medium">
          <Banknote className="h-3.5 w-3.5" /> Gesamtumsatz
        </div>
        <div className="mt-2 flex items-baseline gap-3 flex-wrap">
          <span className="text-4xl md:text-5xl font-bold font-mono tracking-tight">
            {chf(kpis.umsatz)}
          </span>
          {trendPct !== null && (
            <span className={cn(
              "inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full",
              trendPct >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10",
            )}>
              <TrendingUp className={cn("h-3.5 w-3.5", trendPct < 0 && "rotate-180")} />
              {trendPct > 0 ? "+" : ""}{trendPct}%
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Aktueller Monat: <span className="font-mono text-foreground">{chf(aktuellerMonat)}</span>
        </div>
      </div>

      {/* Sekundäre KPIs */}
      <div className="grid grid-cols-3 gap-px bg-border/60 rounded-xl overflow-hidden border border-border/60">
        <Stat icon={FileText} label="Aufträge" value={kpis.total.toString()} />
        <Stat icon={Wrench} label="Stunden" value={`${kpis.stunden.toLocaleString("de-CH", { maximumFractionDigits: 1 })}h`} />
        <Stat icon={Users} label="Kunden" value={kpis.kunden.toString()} />
      </div>

      {/* Monats-Umsatz */}
      <Section
        title="Monats-Umsatz"
        subtitle="Letzte 12 Monate"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monateUmsatz} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="monat" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => chfShort(v)} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, padding: "8px 12px" }}
              formatter={(v: number) => [chf(v), "Umsatz"]}
            />
            <Bar dataKey="umsatz" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Auslastung pro Mechaniker */}
      <Section
        title="Auslastung pro Mechaniker"
        subtitle="Offene Aufträge vs. verfügbare Kapazität"
      >
        {mechAuslastung.length === 0 ? (
          <Empty>Keine offenen Aufträge mit Mechaniker-Zuweisung.</Empty>
        ) : (
          <div className="space-y-5">
            {mechAuslastung.map((m) => {
              const over = m.auslastung > 100;
              const warn = m.auslastung >= 80 && m.auslastung <= 100;
              const barColor = over ? "bg-red-500" : warn ? "bg-amber-500" : "bg-emerald-500";
              const pillColor = over
                ? "text-red-500 bg-red-500/10"
                : warn
                  ? "text-amber-500 bg-amber-500/10"
                  : "text-emerald-500 bg-emerald-500/10";
              return (
                <div key={m.mechaniker}>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-base">{m.mechaniker}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {m.verplant.toLocaleString("de-CH", { maximumFractionDigits: 1 })}/{m.kapazitaet}h
                      </span>
                    </div>
                    <span className={cn("text-xs font-bold font-mono px-2 py-0.5 rounded-full", pillColor)}>
                      {m.auslastung}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full transition-all rounded-full", barColor)}
                      style={{ width: `${Math.min(100, m.auslastung)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Mechaniker-Vergleich */}
      <Section title="Mechaniker-Vergleich" subtitle="Stunden & Umsatz gesamt">
        {mechVergleich.length === 0 ? (
          <Empty>Noch keine Daten.</Empty>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mechVergleich} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mechaniker" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => chfShort(v)} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              <Bar yAxisId="left" dataKey="stunden" name="Stunden" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={48} />
              <Bar yAxisId="right" dataKey="umsatz" name="Umsatz CHF" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Kategorie-Verteilung */}
      <Section title="Kategorien" subtitle="Umsatz & Anzahl pro Kategorie">
        {kategorieVergleich.every((k) => k.anzahl === 0) ? (
          <Empty>Noch keine Daten.</Empty>
        ) : (
          <div className="space-y-3">
            {(() => {
              const maxUmsatz = Math.max(...kategorieVergleich.map((k) => k.umsatz), 1);
              return kategorieVergleich.map((k) => {
                const pct = (k.umsatz / maxUmsatz) * 100;
                return (
                  <div key={k.id}>
                    <div className="flex items-baseline justify-between mb-1.5 gap-2">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-mono text-xs text-muted-foreground">{k.id}</span>
                        <span className="font-semibold text-sm truncate">{k.label}</span>
                      </div>
                      <div className="flex items-baseline gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground font-mono">{k.anzahl}×</span>
                        <span className="font-mono font-semibold text-sm tabular-nums">{chf(k.umsatz)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </Section>

      {/* Top-Kunden */}
      <Section title="Top-Kunden" subtitle="Sortiert nach Umsatz" noPadding>
        {topKunden.length === 0 ? (
          <div className="px-4 pb-4"><Empty>Noch keine Daten.</Empty></div>
        ) : (
          <ul className="divide-y divide-border/60">
            {topKunden.slice(0, 20).map((k, i) => {
              const slug = encodeURIComponent(k.kundennummer || k.kunde_name || k.key);
              return (
                <li key={k.key}>
                  <Link
                    to={`/kunde/${slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors group"
                  >
                    <div className={cn(
                      "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono",
                      i < 3 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}>
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{k.kunde_name || "—"}</div>
                      <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                        {k.kundennummer && <span className="font-mono">#{k.kundennummer}</span>}
                        {k.kunde_ort && <span>{k.kunde_ort}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm tabular-nums">{chf(k.umsatz)}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {k.anzahl} {k.anzahl === 1 ? "Auftrag" : "Aufträge"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card p-4 md:p-5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-medium">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-xl md:text-2xl font-bold font-mono mt-1.5 truncate tabular-nums">{value}</div>
    </div>
  );
}

function Section({
  title, subtitle, children, noPadding,
}: { title: string; subtitle?: string; children: React.ReactNode; noPadding?: boolean }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/30 overflow-hidden">
      <div className="px-4 md:px-5 pt-4 pb-3">
        <h2 className="font-semibold text-base">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className={noPadding ? "" : "px-4 md:px-5 pb-5"}>
        {children}
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground/70">{children}</div>
  );
}
