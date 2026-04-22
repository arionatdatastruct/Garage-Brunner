import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Search, FileText, Archive as ArchiveIcon, RotateCcw,
  Download, FileArchive, X, Filter as FilterIcon, ChevronDown,
  ArrowUpDown, MoreVertical, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { KategorieBadges } from "@/components/KategorieBadges";
import { downloadStorageFile, toSignedUrl } from "@/lib/storage";
import { KATEGORIEN, parseKategorien } from "@/lib/kategorien";
import { cn } from "@/lib/utils";

interface Position {
  beschreibung: string | null;
  typ: "arbeit" | "material";
  menge: number | null;
  einheit: string | null;
  sort_order: number;
}

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  auftragsnummer: string | null;
  status: "geplant" | "in_arbeit" | "erledigt" | "archiviert";
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
  positionen?: Position[] | null;
}

type StatusFilter = "alle" | "erledigt" | "archiviert";
type SortKey = "datum" | "umsatz" | "stunden" | "kunde" | "kennzeichen";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  datum: "Datum",
  umsatz: "Umsatz",
  stunden: "Stunden",
  kunde: "Kunde",
  kennzeichen: "Kennzeichen",
};

const sortFieldOf = (k: SortKey): keyof Rapport => ({
  datum: "geplantes_datum",
  umsatz: "auftragswert_chf",
  stunden: "arbeitszeit_stunden",
  kunde: "kunde_name",
  kennzeichen: "kennzeichen",
} as const)[k];

interface ChipProps {
  label: string;
  active?: boolean;
  onClear?: () => void;
  children?: React.ReactNode;
}

function FilterChip({ label, active, onClear, children }: ChipProps) {
  return (
    <DropdownMenu>
      <div
        className={cn(
          "inline-flex items-center rounded-full border text-xs h-8 transition-colors",
          active
            ? "bg-primary/15 border-primary/40 text-foreground"
            : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80",
        )}
      >
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center gap-1 pl-3 pr-2 h-full">
            <span>{label}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        {active && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="pr-2 pl-1 h-full flex items-center hover:text-destructive"
            aria-label="Filter entfernen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <DropdownMenuContent align="start" className="w-56">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Archiv() {
  const [rows, setRows] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<StatusFilter>("alle");
  const [mech, setMech] = useState<string>("alle");
  const [kategorie, setKategorie] = useState<string>("alle");
  const [zeitraum, setZeitraum] = useState<"alle" | "30" | "90" | "365" | "ytd">("alle");
  const [hatPdf, setHatPdf] = useState<"alle" | "ja" | "nein">("alle");
  const [sortKey, setSortKey] = useState<SortKey>("datum");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("arbeitsrapporte")
      .select("id, rapport_nummer, auftragsnummer, status, geplantes_datum, pdf_url, mechaniker_zuweisung, arbeitszeit_stunden, auftragswert_chf, kategorie, kennzeichen, marke, modell, kundennummer, kunde_name, kunde_ort, positionen:rapport_positionen(beschreibung, typ, menge, einheit, sort_order)")
      .in("status", ["erledigt", "archiviert"])
      .order("geplantes_datum", { ascending: false })
      .limit(500);
    if (error) toast.error("Laden fehlgeschlagen");
    setRows((data ?? []) as Rapport[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const zeitraumStart = useMemo(() => {
    const today = new Date();
    if (zeitraum === "alle") return null;
    if (zeitraum === "ytd") return `${today.getFullYear()}-01-01`;
    const days = parseInt(zeitraum, 10);
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }, [zeitraum]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusF !== "alle" && r.status !== statusF) return false;
      if (mech !== "alle" && r.mechaniker_zuweisung !== mech) return false;
      if (kategorie !== "alle" && !parseKategorien(r.kategorie).includes(kategorie)) return false;
      if (zeitraumStart && r.geplantes_datum < zeitraumStart) return false;
      if (hatPdf === "ja" && !r.pdf_url) return false;
      if (hatPdf === "nein" && r.pdf_url) return false;
      if (!term) return true;
      const positionenText = (r.positionen ?? [])
        .map((p) => p.beschreibung ?? "")
        .join(" ");
      const hay = [
        r.kennzeichen, r.marke, r.modell, r.kunde_name,
        r.kundennummer, r.kunde_ort, r.rapport_nummer, r.auftragsnummer,
        positionenText,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q, statusF, mech, kategorie, zeitraumStart, hatPdf]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const field = sortFieldOf(sortKey);
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "de") * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totals = useMemo(() => {
    const umsatz = sorted.reduce((s, r) => s + (r.auftragswert_chf ?? 0), 0);
    const stunden = sorted.reduce((s, r) => s + (r.arbeitszeit_stunden ?? 0), 0);
    return { umsatz, stunden };
  }, [sorted]);

  const aktiveCount =
    (statusF !== "alle" ? 1 : 0) + (mech !== "alle" ? 1 : 0) +
    (kategorie !== "alle" ? 1 : 0) + (zeitraum !== "alle" ? 1 : 0) +
    (hatPdf !== "alle" ? 1 : 0);

  const resetAll = () => {
    setStatusF("alle"); setMech("alle"); setKategorie("alle");
    setZeitraum("alle"); setHatPdf("alle"); setQ("");
  };

  const setStatus = async (id: string, status: Rapport["status"]) => {
    const { error } = await (supabase as any)
      .from("arbeitsrapporte")
      .update({ status })
      .eq("id", id);
    if (error) { toast.error("Status-Update fehlgeschlagen"); return; }
    toast.success(status === "archiviert" ? "Archiviert" : "Reaktiviert");
    load();
  };

  const [exporting, setExporting] = useState<null | "csv" | "zip">(null);

  const exportCsv = () => {
    const header = ["Datum", "Rapport-Nr", "Auftragsnr", "Status", "Kennzeichen", "Marke", "Modell", "Kundennr", "Kunde", "Ort", "Mechaniker", "Stunden", "CHF"];
    const rowsCsv = sorted.map((r) => [
      r.geplantes_datum, r.rapport_nummer ?? "", r.auftragsnummer ?? "", r.status,
      r.kennzeichen ?? "", r.marke ?? "", r.modell ?? "", r.kundennummer ?? "",
      r.kunde_name ?? "", r.kunde_ort ?? "", r.mechaniker_zuweisung ?? "",
      r.arbeitszeit_stunden ?? "", r.auftragswert_chf ?? "",
    ]);
    const escape = (v: any) => {
      const s = String(v ?? "");
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header, ...rowsCsv].map((row) => row.map(escape).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `archiv_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportZip = async () => {
    const withPdf = sorted.filter((r) => r.pdf_url);
    if (withPdf.length === 0) { toast.error("Keine PDFs in der Auswahl"); return; }
    setExporting("zip");
    try {
      const zip = new JSZip();
      let ok = 0;
      await Promise.all(withPdf.map(async (r) => {
        try {
          const blob = await downloadStorageFile(r.pdf_url!);
          if (!blob) return;
          const buf = await blob.arrayBuffer();
          const safe = (s: string) => s.replace(/[^a-z0-9-_]+/gi, "_");
          const name = `${r.geplantes_datum}_${safe(r.kennzeichen ?? "")}_${safe(r.auftragsnummer ?? r.rapport_nummer ?? r.id.slice(0, 8))}.pdf`;
          zip.file(name, buf); ok++;
        } catch { /* skip */ }
      }));
      if (ok === 0) { toast.error("Keine PDFs konnten geladen werden"); return; }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `archiv_pdfs_${new Date().toISOString().slice(0, 10)}.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${ok} PDFs exportiert`);
    } finally { setExporting(null); }
  };

  // Labels für Chips
  const statusLabel = statusF === "alle" ? "Status" : statusF === "erledigt" ? "Erledigt" : "Archiviert";
  const mechLabel = mech === "alle" ? "Mechaniker" : mech;
  const katLabel = kategorie === "alle" ? "Kategorie" : (KATEGORIEN.find((k) => k.id === kategorie)?.label ?? "Kategorie");
  const zeitLabel = ({
    alle: "Zeitraum",
    "30": "Letzte 30 Tage",
    "90": "Letzte 90 Tage",
    "365": "Letztes Jahr",
    ytd: "Dieses Jahr",
  } as const)[zeitraum];
  const pdfLabel = hatPdf === "alle" ? "PDF" : hatPdf === "ja" ? "Mit PDF" : "Ohne PDF";

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Archiv</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-3">
            <span><span className="font-semibold text-foreground">{sorted.length}</span> {sorted.length === 1 ? "Auftrag" : "Aufträge"}</span>
            <span className="font-mono"><span className="text-foreground font-semibold">CHF {totals.umsatz.toLocaleString("de-CH", { minimumFractionDigits: 2 })}</span></span>
            <span className="font-mono"><span className="text-foreground font-semibold">{totals.stunden.toLocaleString("de-CH", { maximumFractionDigits: 1 })}h</span></span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1.5" /> Export
              <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCsv} disabled={sorted.length === 0}>
              <Download className="h-4 w-4 mr-2" /> CSV-Datei
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportZip} disabled={sorted.length === 0 || exporting === "zip"}>
              {exporting === "zip" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileArchive className="h-4 w-4 mr-2" />}
              PDFs als ZIP
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sticky Suchleiste */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/85 backdrop-blur-md border-b border-border/50 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kennzeichen, Kunde, Auftragsnr. oder Material/Arbeit (z.B. 'Öl')…"
            className="pl-9 pr-9 h-11"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter-Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterIcon className="h-4 w-4 text-muted-foreground shrink-0" />

          <FilterChip label={statusLabel} active={statusF !== "alle"} onClear={() => setStatusF("alle")}>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={statusF} onValueChange={(v) => setStatusF(v as StatusFilter)}>
              <DropdownMenuRadioItem value="alle">Alle</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="erledigt">Erledigt</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="archiviert">Archiviert</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </FilterChip>

          <FilterChip label={zeitLabel} active={zeitraum !== "alle"} onClear={() => setZeitraum("alle")}>
            <DropdownMenuLabel>Zeitraum</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={zeitraum} onValueChange={(v) => setZeitraum(v as typeof zeitraum)}>
              <DropdownMenuRadioItem value="alle">Alle</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="30">Letzte 30 Tage</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="90">Letzte 90 Tage</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="365">Letztes Jahr</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ytd">Dieses Jahr</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </FilterChip>

          <FilterChip label={mechLabel} active={mech !== "alle"} onClear={() => setMech("alle")}>
            <DropdownMenuLabel>Mechaniker</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={mech} onValueChange={setMech}>
              <DropdownMenuRadioItem value="alle">Alle</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="Roman">Roman</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="Pascal">Pascal</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </FilterChip>

          <FilterChip label={katLabel} active={kategorie !== "alle"} onClear={() => setKategorie("alle")}>
            <DropdownMenuLabel>Kategorie</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={kategorie} onValueChange={setKategorie}>
              <DropdownMenuRadioItem value="alle">Alle</DropdownMenuRadioItem>
              {KATEGORIEN.map((k) => (
                <DropdownMenuRadioItem key={k.id} value={k.id}>{k.label}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </FilterChip>

          <FilterChip label={pdfLabel} active={hatPdf !== "alle"} onClear={() => setHatPdf("alle")}>
            <DropdownMenuLabel>PDF</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={hatPdf} onValueChange={(v) => setHatPdf(v as typeof hatPdf)}>
              <DropdownMenuRadioItem value="alle">Alle</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ja">Mit PDF</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="nein">Ohne PDF</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </FilterChip>

          {aktiveCount > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="text-xs text-muted-foreground hover:text-destructive underline-offset-4 hover:underline ml-1"
            >
              Alle löschen
            </button>
          )}

          {/* Sort */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card text-xs h-8 px-3 text-muted-foreground hover:text-foreground"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>{SORT_LABELS[sortKey]} {sortDir === "asc" ? "↑" : "↓"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <DropdownMenuItem
                    key={k}
                    onClick={() => { setSortKey(k); }}
                    className={sortKey === k ? "bg-accent" : ""}
                  >
                    {SORT_LABELS[k]}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortDir("desc")} className={sortDir === "desc" ? "bg-accent" : ""}>
                  Absteigend ↓
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortDir("asc")} className={sortDir === "asc" ? "bg-accent" : ""}>
                  Aufsteigend ↑
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="p-12 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Lade…
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-16 text-center">
          <ArchiveIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Keine Aufträge gefunden.</p>
          {aktiveCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetAll} className="mt-3">
              Filter zurücksetzen
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden bg-card/30">
          {sorted.map((r) => (
            <li key={r.id} className="group">
              <Link
                to={`/auftrag/${r.id}`}
                className="flex items-center gap-3 px-3 md:px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                {/* Status-Indikator */}
                <div
                  className={cn(
                    "w-1 self-stretch rounded-full shrink-0",
                    r.status === "erledigt" ? "bg-emerald-500" : "bg-muted-foreground/30",
                  )}
                  aria-hidden
                />

                {/* Kennzeichen + Fahrzeug */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono font-bold text-base md:text-lg tracking-tight">
                      {r.kennzeichen || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[r.marke, r.modell].filter(Boolean).join(" ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span className="truncate">{r.kunde_name || "—"}</span>
                    {r.kunde_ort && <><span>·</span><span className="truncate">{r.kunde_ort}</span></>}
                    {r.mechaniker_zuweisung && <><span>·</span><span>{r.mechaniker_zuweisung}</span></>}
                  </div>
                  <div className="mt-1.5 hidden sm:block">
                    <KategorieBadges value={r.kategorie} size="xs" />
                  </div>
                </div>

                {/* Datum + Werte */}
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(r.geplantes_datum).toLocaleDateString("de-CH")}
                  </div>
                  <div className="font-mono font-semibold mt-0.5">
                    {r.auftragswert_chf != null
                      ? `CHF ${r.auftragswert_chf.toLocaleString("de-CH", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </div>
                  {r.arbeitszeit_stunden != null && (
                    <div className="text-xs text-muted-foreground font-mono">
                      {r.arbeitszeit_stunden}h
                    </div>
                  )}
                </div>

                {/* Mobile: nur Datum + Umsatz kompakt */}
                <div className="text-right shrink-0 sm:hidden">
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {new Date(r.geplantes_datum).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </div>
                  {r.auftragswert_chf != null && (
                    <div className="font-mono text-xs font-semibold mt-0.5">
                      {r.auftragswert_chf.toLocaleString("de-CH", { maximumFractionDigits: 0 })}
                    </div>
                  )}
                </div>

                {/* Aktionen */}
                <div onClick={(e) => e.preventDefault()} className="shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-60 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {r.pdf_url && (
                        <DropdownMenuItem
                          onClick={async () => {
                            const signed = await toSignedUrl(r.pdf_url);
                            if (signed) window.open(signed, "_blank", "noopener,noreferrer");
                            else toast.error("PDF konnte nicht geladen werden");
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" /> PDF öffnen
                        </DropdownMenuItem>
                      )}
                      {r.status === "erledigt" ? (
                        <DropdownMenuItem onClick={() => setStatus(r.id, "archiviert")}>
                          <ArchiveIcon className="h-4 w-4 mr-2" /> Archivieren
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setStatus(r.id, "erledigt")}>
                          <RotateCcw className="h-4 w-4 mr-2" /> Reaktivieren
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
