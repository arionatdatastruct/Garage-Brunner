import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Search, FileText, Archive as ArchiveIcon, RotateCcw,
  ExternalLink, Download, FileArchive, ArrowUp, ArrowDown, ArrowUpDown, X,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { KategorieBadges } from "@/components/KategorieBadges";
import { downloadStorageFile, toSignedUrl } from "@/lib/storage";
import { KATEGORIEN, parseKategorien } from "@/lib/kategorien";

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
}

type Filter = "alle" | "erledigt" | "archiviert";
type SortKey =
  | "geplantes_datum" | "rapport_nummer" | "kennzeichen" | "kunde_name"
  | "kategorie" | "mechaniker_zuweisung" | "arbeitszeit_stunden"
  | "auftragswert_chf" | "status";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  geplantes_datum: "Datum",
  rapport_nummer: "Nr.",
  kennzeichen: "Fahrzeug",
  kunde_name: "Kunde",
  kategorie: "Kategorie",
  mechaniker_zuweisung: "Mechaniker",
  arbeitszeit_stunden: "Stunden",
  auftragswert_chf: "Umsatz",
  status: "Status",
};

export default function Archiv() {
  const [rows, setRows] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [mech, setMech] = useState<string>("alle");
  const [kategorie, setKategorie] = useState<string>("alle");
  const [von, setVon] = useState<string>("");
  const [bis, setBis] = useState<string>("");
  const [hatPdf, setHatPdf] = useState<"alle" | "ja" | "nein">("alle");
  const [sortKey, setSortKey] = useState<SortKey>("geplantes_datum");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("arbeitsrapporte")
      .select("id, rapport_nummer, auftragsnummer, status, geplantes_datum, pdf_url, mechaniker_zuweisung, arbeitszeit_stunden, auftragswert_chf, kategorie, kennzeichen, marke, modell, kundennummer, kunde_name, kunde_ort")
      .in("status", ["erledigt", "archiviert"])
      .order("geplantes_datum", { ascending: false })
      .limit(500);
    if (error) toast.error("Laden fehlgeschlagen");
    setRows((data ?? []) as Rapport[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "alle" && r.status !== filter) return false;
      if (mech !== "alle" && r.mechaniker_zuweisung !== mech) return false;
      if (kategorie !== "alle" && !parseKategorien(r.kategorie).includes(kategorie)) return false;
      if (von && r.geplantes_datum < von) return false;
      if (bis && r.geplantes_datum > bis) return false;
      if (hatPdf === "ja" && !r.pdf_url) return false;
      if (hatPdf === "nein" && r.pdf_url) return false;
      if (!term) return true;
      const hay = [
        r.kennzeichen, r.marke, r.modell, r.kunde_name,
        r.kundennummer, r.kunde_ort, r.rapport_nummer, r.auftragsnummer,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q, filter, mech, kategorie, von, bis, hatPdf]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "geplantes_datum" || key === "auftragswert_chf" ? "desc" : "asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const SortableTh = ({ col, align = "left", children }: { col: SortKey; align?: "left" | "right"; children: React.ReactNode }) => (
    <th className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {children}
        <SortIcon col={col} />
      </button>
    </th>
  );

  const resetFilters = () => {
    setQ(""); setFilter("alle"); setMech("alle"); setKategorie("alle");
    setVon(""); setBis(""); setHatPdf("alle");
  };

  const aktiveFilter =
    (q ? 1 : 0) + (filter !== "alle" ? 1 : 0) + (mech !== "alle" ? 1 : 0) +
    (kategorie !== "alle" ? 1 : 0) + (von ? 1 : 0) + (bis ? 1 : 0) +
    (hatPdf !== "alle" ? 1 : 0);

  const setStatus = async (id: string, status: Rapport["status"]) => {
    const { error } = await (supabase as any)
      .from("arbeitsrapporte")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Status-Update fehlgeschlagen");
      return;
    }
    toast.success(status === "archiviert" ? "Archiviert" : "Status: " + status);
    load();
  };

  const [exporting, setExporting] = useState<null | "csv" | "zip">(null);

  const exportCsv = () => {
    const header = ["Datum", "Rapport-Nr", "Auftragsnr", "Status", "Kennzeichen", "Marke", "Modell", "Kundennr", "Kunde", "Ort", "Mechaniker", "Stunden", "CHF"];
    const rowsCsv = sorted.map((r) => [
      r.geplantes_datum,
      r.rapport_nummer ?? "",
      r.auftragsnummer ?? "",
      r.status,
      r.kennzeichen ?? "",
      r.marke ?? "",
      r.modell ?? "",
      r.kundennummer ?? "",
      r.kunde_name ?? "",
      r.kunde_ort ?? "",
      r.mechaniker_zuweisung ?? "",
      r.arbeitszeit_stunden ?? "",
      r.auftragswert_chf ?? "",
    ]);
    const escape = (v: any) => {
      const s = String(v ?? "");
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header, ...rowsCsv].map((row) => row.map(escape).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `archiv_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportZip = async () => {
    const withPdf = sorted.filter((r) => r.pdf_url);
    if (withPdf.length === 0) {
      toast.error("Keine PDFs in der Auswahl");
      return;
    }
    setExporting("zip");
    try {
      const zip = new JSZip();
      let ok = 0;
      await Promise.all(
        withPdf.map(async (r) => {
          try {
            const blob = await downloadStorageFile(r.pdf_url!);
            if (!blob) return;
            const buf = await blob.arrayBuffer();
            const safe = (s: string) => s.replace(/[^a-z0-9-_]+/gi, "_");
            const name = `${r.geplantes_datum}_${safe(r.kennzeichen ?? "")}_${safe(r.auftragsnummer ?? r.rapport_nummer ?? r.id.slice(0, 8))}.pdf`;
            zip.file(name, buf);
            ok++;
          } catch { /* skip */ }
        })
      );
      if (ok === 0) {
        toast.error("Keine PDFs konnten geladen werden");
        return;
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archiv_pdfs_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${ok} PDFs exportiert`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6" /> Archiv
          </h1>
          <p className="text-sm text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? "Auftrag" : "Aufträge"} ·{" "}
            <span className="font-mono">
              CHF {totals.umsatz.toLocaleString("de-CH", { minimumFractionDigits: 2 })}
            </span>{" "}
            · <span className="font-mono">{totals.stunden.toLocaleString("de-CH", { maximumFractionDigits: 1 })} h</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={sorted.length === 0}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportZip} disabled={sorted.length === 0 || exporting === "zip"}>
            {exporting === "zip" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileArchive className="h-4 w-4 mr-1" />}
            PDFs (ZIP)
          </Button>
        </div>
      </div>

      {/* Filter */}
      <Card className="p-3 space-y-2">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Kennzeichen, Kunde, Nr…"
              className="pl-8"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Status</SelectItem>
              <SelectItem value="erledigt">Erledigt</SelectItem>
              <SelectItem value="archiviert">Archiviert</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mech} onValueChange={setMech}>
            <SelectTrigger className="md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Mechaniker</SelectItem>
              <SelectItem value="Roman">Roman</SelectItem>
              <SelectItem value="Pascal">Pascal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kategorie} onValueChange={setKategorie}>
            <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Kategorien</SelectItem>
              {KATEGORIEN.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Von</span>
            <Input type="date" value={von} onChange={(e) => setVon(e.target.value)} className="md:w-40" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Bis</span>
            <Input type="date" value={bis} onChange={(e) => setBis(e.target.value)} className="md:w-40" />
          </div>
          <Select value={hatPdf} onValueChange={(v) => setHatPdf(v as typeof hatPdf)}>
            <SelectTrigger className="md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">PDF: alle</SelectItem>
              <SelectItem value="ja">Mit PDF</SelectItem>
              <SelectItem value="nein">Ohne PDF</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortKey}:${sortDir}`} onValueChange={(v) => {
            const [k, d] = v.split(":") as [SortKey, SortDir];
            setSortKey(k); setSortDir(d);
          }}>
            <SelectTrigger className="md:w-56"><SelectValue placeholder="Sortierung" /></SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).flatMap((k) => [
                <SelectItem key={`${k}:desc`} value={`${k}:desc`}>{SORT_LABELS[k]} ↓</SelectItem>,
                <SelectItem key={`${k}:asc`} value={`${k}:asc`}>{SORT_LABELS[k]} ↑</SelectItem>,
              ])}
            </SelectContent>
          </Select>
          {aktiveFilter > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="md:ml-auto">
              <X className="h-4 w-4 mr-1" /> Filter zurücksetzen ({aktiveFilter})
            </Button>
          )}
        </div>
      </Card>

      {/* Liste */}
      {loading ? (
        <div className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Lade…
        </div>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Keine Aufträge gefunden.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <SortableTh col="geplantes_datum">Datum</SortableTh>
                  <SortableTh col="rapport_nummer">Nr.</SortableTh>
                  <SortableTh col="kennzeichen">Fahrzeug</SortableTh>
                  <SortableTh col="kunde_name">Kunde</SortableTh>
                  <SortableTh col="kategorie">Kategorie</SortableTh>
                  <SortableTh col="mechaniker_zuweisung">Mech.</SortableTh>
                  <SortableTh col="arbeitszeit_stunden" align="right">h</SortableTh>
                  <SortableTh col="auftragswert_chf" align="right">CHF</SortableTh>
                  <SortableTh col="status">Status</SortableTh>
                  <th className="text-right px-3 py-2 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                      {new Date(r.geplantes_datum).toLocaleDateString("de-CH")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.auftragsnummer || r.rapport_nummer || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-mono font-semibold">{r.kennzeichen || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {[r.marke, r.modell].filter(Boolean).join(" ")}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{r.kunde_name || "—"}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        {r.kundennummer && <span className="font-mono">#{r.kundennummer}</span>}
                        {r.kunde_ort && <span>{r.kunde_ort}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <KategorieBadges value={r.kategorie} size="xs" />
                    </td>
                    <td className="px-3 py-2 text-xs">{r.mechaniker_zuweisung || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {r.arbeitszeit_stunden ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.auftragswert_chf != null
                        ? r.auftragswert_chf.toLocaleString("de-CH", { minimumFractionDigits: 2 })
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          "text-[10px] px-1.5 py-0.5 rounded border " +
                          (r.status === "archiviert"
                            ? "bg-muted text-muted-foreground border-border"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30")
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Link to={`/auftrag/${r.id}`}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Öffnen">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        {r.pdf_url && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="PDF öffnen"
                            onClick={async () => {
                              const signed = await toSignedUrl(r.pdf_url);
                              if (signed) window.open(signed, "_blank", "noopener,noreferrer");
                              else toast.error("PDF konnte nicht geladen werden");
                            }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {r.status === "erledigt" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Archivieren"
                            onClick={() => setStatus(r.id, "archiviert")}
                          >
                            <ArchiveIcon className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Reaktivieren"
                            onClick={() => setStatus(r.id, "erledigt")}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
