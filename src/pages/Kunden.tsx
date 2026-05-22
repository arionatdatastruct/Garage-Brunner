import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Search, Users, ChevronRight, Phone, Mail, MapPin,
  X, ChevronDown, Filter as FilterIcon, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

type SortKey = "name" | "kundennummer" | "ort" | "plz";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  kundennummer: "Kundennummer",
  ort: "Ort",
  plz: "PLZ",
};

interface ChipProps { label: string; active?: boolean; onClear?: () => void; children?: React.ReactNode; }
function FilterChip({ label, active, onClear, children }: ChipProps) {
  return (
    <DropdownMenu>
      <div className={cn(
        "inline-flex items-center rounded-full border text-xs h-8 transition-colors",
        active
          ? "bg-primary/15 border-primary/40 text-foreground"
          : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80",
      )}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center gap-1 pl-3 pr-2 h-full">
            <span>{label}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        {active && onClear && (
          <button type="button" onClick={onClear}
            className="pr-2 pl-1 h-full flex items-center hover:text-destructive" aria-label="Filter entfernen">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Kunden() {
  const [rows, setRows] = useState<KundeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [ort, setOrt] = useState<string>("alle");
  const [hatEmail, setHatEmail] = useState<"alle" | "ja" | "nein">("alle");
  const [hatTelefon, setHatTelefon] = useState<"alle" | "ja" | "nein">("alle");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

  const orte = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.ort) set.add(r.ort); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (ort !== "alle" && r.ort !== ort) return false;
      if (hatEmail === "ja" && !r.email) return false;
      if (hatEmail === "nein" && r.email) return false;
      if (hatTelefon === "ja" && !r.telefon) return false;
      if (hatTelefon === "nein" && r.telefon) return false;
      if (!s) return true;
      return [r.name, r.kundennummer, r.ort, r.plz, r.strasse, r.telefon, r.email]
        .filter(Boolean).some((v) => v!.toString().toLowerCase().includes(s));
    });
  }, [rows, q, ort, hatEmail, hatTelefon]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const getVal = (r: KundeRow): string | null => {
      switch (sortKey) {
        case "name": return r.name;
        case "kundennummer": return r.kundennummer;
        case "ort": return r.ort;
        case "plz": return r.plz;
      }
    };
    arr.sort((a, b) => {
      const av = getVal(a); const bv = getVal(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return String(av).localeCompare(String(bv), "de", { numeric: true }) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const aktiveCount =
    (ort !== "alle" ? 1 : 0) + (hatEmail !== "alle" ? 1 : 0) + (hatTelefon !== "alle" ? 1 : 0);
  const resetAll = () => { setOrt("alle"); setHatEmail("alle"); setHatTelefon("alle"); setQ(""); };

  const ortLabel = ort === "alle" ? "Ort" : ort;
  const emailLabel = hatEmail === "alle" ? "E-Mail" : hatEmail === "ja" ? "Mit E-Mail" : "Ohne E-Mail";
  const telLabel = hatTelefon === "alle" ? "Telefon" : hatTelefon === "ja" ? "Mit Telefon" : "Ohne Telefon";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" /> Kunden
        </h1>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{sorted.length}</span> von {rows.length}
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/85 backdrop-blur-md border-b border-border/50 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Name, Kundennummer, Ort, Telefon, E-Mail…"
            value={q} onChange={(e) => setQ(e.target.value)}
            className="pl-9 pr-9 h-11"
          />
          {q && (
            <button type="button" onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FilterIcon className="h-4 w-4 text-muted-foreground shrink-0" />

          <FilterChip label={ortLabel} active={ort !== "alle"} onClear={() => setOrt("alle")}>
            <DropdownMenuLabel>Ort</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={ort} onValueChange={setOrt}>
              <DropdownMenuRadioItem value="alle">Alle</DropdownMenuRadioItem>
              {orte.map((o) => (
                <DropdownMenuRadioItem key={o} value={o}>{o}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </FilterChip>

          <FilterChip label={emailLabel} active={hatEmail !== "alle"} onClear={() => setHatEmail("alle")}>
            <DropdownMenuLabel>E-Mail</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={hatEmail} onValueChange={(v) => setHatEmail(v as typeof hatEmail)}>
              <DropdownMenuRadioItem value="alle">Alle</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ja">Mit E-Mail</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="nein">Ohne E-Mail</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </FilterChip>

          <FilterChip label={telLabel} active={hatTelefon !== "alle"} onClear={() => setHatTelefon("alle")}>
            <DropdownMenuLabel>Telefon</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={hatTelefon} onValueChange={(v) => setHatTelefon(v as typeof hatTelefon)}>
              <DropdownMenuRadioItem value="alle">Alle</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ja">Mit Telefon</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="nein">Ohne Telefon</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </FilterChip>

          {aktiveCount > 0 && (
            <button type="button" onClick={resetAll}
              className="text-xs text-muted-foreground hover:text-destructive underline-offset-4 hover:underline ml-1">
              Alle löschen
            </button>
          )}

          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card text-xs h-8 px-3 text-muted-foreground hover:text-foreground">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>{SORT_LABELS[sortKey]} {sortDir === "asc" ? "↑" : "↓"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <DropdownMenuItem key={k} onClick={() => setSortKey(k)}
                    className={sortKey === k ? "bg-accent" : ""}>
                    {SORT_LABELS[k]}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
                  Richtung: {sortDir === "asc" ? "Aufsteigend ↑" : "Absteigend ↓"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Lade Kunden…
        </div>
      ) : sorted.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Keine Kunden gefunden.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {sorted.map((k) => {
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
