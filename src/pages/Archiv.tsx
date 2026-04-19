import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, FileText, Archive as ArchiveIcon, RotateCcw, ExternalLink, Download, FileArchive } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { KategorieBadges } from "@/components/KategorieBadges";

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

export default function Archiv() {
  const [rows, setRows] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [mech, setMech] = useState<string>("alle");

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
      if (!term) return true;
      const hay = [
        r.kennzeichen, r.marke, r.modell, r.kunde_name,
        r.kundennummer, r.kunde_ort, r.rapport_nummer, r.auftragsnummer,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q, filter, mech]);

  const totalUmsatz = useMemo(
    () => filtered.reduce((s, r) => s + (r.auftragswert_chf ?? 0), 0),
    [filtered]
  );

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
    const rowsCsv = filtered.map((r) => [
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
    // BOM für Excel UTF-8
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `archiv_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportZip = async () => {
    const withPdf = filtered.filter((r) => r.pdf_url);
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
            const res = await fetch(r.pdf_url!);
            if (!res.ok) return;
            const buf = await res.arrayBuffer();
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
            {filtered.length} {filtered.length === 1 ? "Auftrag" : "Aufträge"} ·
            <span className="font-mono ml-1">
              CHF {totalUmsatz.toLocaleString("de-CH", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportZip} disabled={filtered.length === 0 || exporting === "zip"}>
            {exporting === "zip" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileArchive className="h-4 w-4 mr-1" />}
            PDFs (ZIP)
          </Button>
        </div>
      </div>

      {/* Filter */}
      <Card className="p-3 flex flex-col md:flex-row gap-2 md:items-center">
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
          <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle (erledigt+archiv.)</SelectItem>
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
      </Card>

      {/* Liste */}
      {loading ? (
        <div className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Lade…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Keine Aufträge gefunden.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Datum</th>
                  <th className="text-left px-3 py-2 font-medium">Nr.</th>
                  <th className="text-left px-3 py-2 font-medium">Fahrzeug</th>
                  <th className="text-left px-3 py-2 font-medium">Kunde</th>
                  <th className="text-left px-3 py-2 font-medium">Mech.</th>
                  <th className="text-right px-3 py-2 font-medium">h</th>
                  <th className="text-right px-3 py-2 font-medium">CHF</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
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
                          <a href={r.pdf_url} target="_blank" rel="noreferrer">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="PDF">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </a>
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
