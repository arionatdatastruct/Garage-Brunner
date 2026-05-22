import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Car, User, ChevronRight } from "lucide-react";

interface FahrzeugRow {
  id: string;
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
  kunde: { name: string | null; kundennummer: string | null; ort: string | null } | null;
}

export default function Fahrzeuge() {
  const [rows, setRows] = useState<FahrzeugRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("fahrzeuge")
        .select("id, kennzeichen, marke, modell, chassis_nr, kunde:kunden(name, kundennummer, ort)")
        .order("kennzeichen", { ascending: true })
        .limit(1000);
      setRows((data ?? []) as FahrzeugRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.kennzeichen, r.marke, r.modell, r.chassis_nr, r.kunde?.name, r.kunde?.kundennummer]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(s)),
    );
  }, [rows, q]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Car className="h-6 w-6" /> Fahrzeuge
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} erfasste Fahrzeuge</p>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Kennzeichen, Marke, Modell, Chassis oder Kunde…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {loading ? (
        <div className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Lade Fahrzeuge…
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Keine Fahrzeuge gefunden.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {filtered.map((f) => (
                <li key={f.id}>
                  <Link
                    to={`/fahrzeug/${encodeURIComponent(f.kennzeichen || "")}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold tracking-wider">{f.kennzeichen || "—"}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {[f.marke, f.modell].filter(Boolean).join(" ") || "—"}
                        {f.chassis_nr && <span className="ml-2 font-mono text-xs">· {f.chassis_nr}</span>}
                      </div>
                      {f.kunde?.name && (
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {f.kunde.name}
                          {f.kunde.kundennummer && (
                            <span className="font-mono">#{f.kunde.kundennummer}</span>
                          )}
                          {f.kunde.ort && <span>· {f.kunde.ort}</span>}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
