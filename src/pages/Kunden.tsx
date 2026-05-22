import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Users, ChevronRight, Phone, Mail, MapPin } from "lucide-react";

interface KundeRow {
  id: string;
  kundennummer: string | null;
  name: string | null;
  ort: string | null;
  plz: string | null;
  strasse: string | null;
  telefon: string | null;
  email: string | null;
}

export default function Kunden() {
  const [rows, setRows] = useState<KundeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("kunden")
        .select("id, kundennummer, name, ort, plz, strasse, telefon, email")
        .order("name", { ascending: true })
        .limit(1000);
      setRows((data ?? []) as KundeRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.name, r.kundennummer, r.ort, r.plz, r.strasse, r.telefon, r.email]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(s)),
    );
  }, [rows, q]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" /> Kunden
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} erfasste Kunden</p>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Name, Kundennummer, Ort, Telefon, E-Mail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {loading ? (
        <div className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Lade Kunden…
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Keine Kunden gefunden.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {filtered.map((k) => {
                const slug = encodeURIComponent(k.kundennummer || k.name || k.id);
                return (
                  <li key={k.id}>
                    <Link
                      to={`/kunde/${slug}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold truncate">{k.name || "—"}</span>
                          {k.kundennummer && (
                            <span className="font-mono text-xs text-muted-foreground">#{k.kundennummer}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {(k.plz || k.ort) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {[k.plz, k.ort].filter(Boolean).join(" ")}
                            </span>
                          )}
                          {k.telefon && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {k.telefon}
                            </span>
                          )}
                          {k.email && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" /> {k.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
