import { useEffect, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFahrzeugSuche } from "@/hooks/useFahrzeugSuche";
import { cn } from "@/lib/utils";

export function GlobalSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, searching, search } = useFahrzeugSuche();
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    search(q);
    if (q.length < 2) setOpen(false);
    else setOpen(true);
  }, [query, search]);


  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onPick = (f: typeof results[number]) => {
    setOpen(false);
    setQuery("");
    // Wenn ein Rapport vorhanden ist → dorthin, sonst zur Fahrzeug-Detail-Seite
    if (f.letzter_rapport_id) {
      navigate(`/auftrag/${f.letzter_rapport_id}`);
    } else if (f.kennzeichen) {
      navigate(`/fahrzeug/${encodeURIComponent(f.kennzeichen)}`);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Kennzeichen, Kunde, Nr…"
          className="w-full h-9 pl-8 pr-8 text-sm rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
        {searching ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Leeren"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.length === 0 && !searching && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              Keine Treffer
            </div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r)}
              className="w-full text-left px-3 py-2 hover:bg-muted transition flex items-center justify-between gap-3 border-b border-border last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm">
                    {r.kennzeichen || "—"}
                  </span>
                  {r.kundennummer && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      #{r.kundennummer}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[r.marke, r.modell].filter(Boolean).join(" ")}
                  {r.kunde_name && ` · ${r.kunde_name}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
