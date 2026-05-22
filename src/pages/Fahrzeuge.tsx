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
  Loader2, Search, Car, User, ChevronRight, X, ChevronDown,
  Filter as FilterIcon, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FahrzeugRow {
  id: string;
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
  kunde: { name: string | null; kundennummer: string | null; ort: string | null } | null;
}

type SortKey = "kennzeichen" | "marke" | "modell" | "kunde";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  kennzeichen: "Kennzeichen",
  marke: "Marke",
  modell: "Modell",
  kunde: "Kunde",
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

export default function Fahrzeuge() {
  const [rows, setRows] = useState<FahrzeugRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [marke, setMarke] = useState<string>("alle");
  const [hatKunde, setHatKunde] = useState<"alle" | "ja" | "nein">("alle");
  const [sortKey, setSortKey] = useState<SortKey>("kennzeichen");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

  const marken = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.marke) set.add(r.marke); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (marke !== "alle" && r.marke !== marke) return false;
      if (hatKunde === "ja" && !r.kunde?.name) return false;
      if (hatKunde === "nein" && r.kunde?.name) return false;
      if (!s) return true;
      return [r.kennzeichen, r.marke, r.modell, r.chassis_nr, r.kunde?.name, r.kunde?.kundennummer]
        .filter(Boolean).some((v) => v!.toString().toLowerCase().includes(s));
    });
  }, [rows, q, marke, hatKunde]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const getVal = (r: FahrzeugRow): string | null => {
      switch (sortKey) {
        case "kennzeichen": return r.kennzeichen;
        case "marke": return r.marke;
        case "modell": return r.modell;
        case "kunde": return r.kunde?.name ?? null;
      }
    };
    arr.sort((a, b) => {
      const av = getVal(a); const bv = getVal(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return String(av).localeCompare(String(bv), "de") * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const aktiveCount = (marke !== "alle" ? 1 : 0) + (hatKunde !== "alle" ? 1 : 0);
  const resetAll = () => { setMarke("alle"); setHatKunde("alle"); setQ(""); };

  const markeLabel = marke === "alle" ? "Marke" : marke;
  const kundeLabel = hatKunde === "alle" ? "Kunde" : hatKunde === "ja" ? "Mit Kunde" : "Ohne Kunde";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Car className="h-6 w-6" /> Fahrzeuge
        </h1>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{sorted.length}</span> von {rows.length}
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/85 backdrop-blur-md border-b border-border/50 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Kennzeichen, Marke, Modell, Chassis oder Kunde…"
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

          <FilterChip label={markeLabel} active={marke !== "alle"} onClear={() => setMarke("alle")}>
            <DropdownMenuLabel>Marke</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={marke} onValueChange={setMarke}>
              <DropdownMenuRadioItem value="alle">Alle</DropdownMenuRadioItem>
              {marken.map((m) => (
                <DropdownMenuRadioItem key={m} value={m}>{m}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </FilterChip>

          <FilterChip label={kundeLabel} active={hatKunde !== "alle"} onClear={() => setHatKunde("alle")}>
            <DropdownMenuLabel>Kunde zugewiesen</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={hatKunde} onValueChange={(v) => setHatKunde(v as typeof hatKunde)}>
              <DropdownMenuRadioItem value="alle">Alle</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ja">Mit Kunde</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="nein">Ohne Kunde</DropdownMenuRadioItem>
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
          <Loader2 className="h-4 w-4 animate-spin" /> Lade Fahrzeuge…
        </div>
      ) : sorted.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Keine Fahrzeuge gefunden.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {sorted.map((f) => (
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
