import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  Banknote,
  Wrench,
  FileText,
  User,
  Car,
  Calendar,
} from "lucide-react";
import { kategorienLabels } from "@/lib/kategorien";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Fahrzeug {
  id: string;
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
  kunde?: {
    id: string;
    name: string | null;
    kundennummer: string | null;
    telefon: string | null;
  } | null;
}

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  status: string;
  geplantes_datum: string;
  pdf_url: string | null;
  mechaniker_zuweisung: string | null;
  arbeitszeit_stunden: number | null;
  auftragswert_chf: number | null;
  kategorie: string | null;
  notizen: string | null;
}

const chf = (n: number) =>
  "CHF " + n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_CLS: Record<string, string> = {
  geplant: "bg-blue-500/15 text-blue-500",
  in_arbeit: "bg-amber-500/15 text-amber-500",
  erledigt: "bg-emerald-500/15 text-emerald-500",
  archiviert: "bg-muted text-muted-foreground",
};

export default function FahrzeugDetail() {
  const { kennzeichen } = useParams();
  const [fahrzeug, setFahrzeug] = useState<Fahrzeug | null>(null);
  const [rows, setRows] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kennzeichen) return;
    (async () => {
      setLoading(true);
      const decoded = decodeURIComponent(kennzeichen).toUpperCase();

      // 1. Fahrzeug finden
      const { data: fzData } = await (supabase as any)
        .from("fahrzeuge")
        .select("id, kennzeichen, marke, modell, chassis_nr, kunde:kunden(id, name, kundennummer, telefon)")
        .ilike("kennzeichen", decoded)
        .limit(1)
        .maybeSingle();

      if (!fzData) {
        setFahrzeug(null);
        setRows([]);
        setLoading(false);
        return;
      }
      setFahrzeug(fzData as Fahrzeug);

      // 2. Rapporte zu diesem Fahrzeug
      const { data } = await (supabase as any)
        .from("arbeitsrapporte")
        .select(
          "id, rapport_nummer, status, geplantes_datum, pdf_url, mechaniker_zuweisung, arbeitszeit_stunden, auftragswert_chf, kategorie, notizen"
        )
        .eq("fahrzeug_id", fzData.id)
        .order("geplantes_datum", { ascending: false })
        .limit(500);
      setRows((data ?? []) as Rapport[]);
      setLoading(false);
    })();
  }, [kennzeichen]);

  const stats = useMemo(() => {
    const umsatz = rows.reduce((s, r) => s + (r.auftragswert_chf ?? 0), 0);
    const stunden = rows.reduce((s, r) => s + (r.arbeitszeit_stunden ?? 0), 0);
    const letzter = rows[0]?.geplantes_datum ?? null;
    return { umsatz, stunden, anzahl: rows.length, letzter };
  }, [rows]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Lade Fahrzeug…
      </div>
    );
  }

  if (!fahrzeug) {
    return (
      <div className="p-6">
        <Link to="/" className="text-sm text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Zurück
        </Link>
        <p className="mt-4">Fahrzeug nicht gefunden.</p>
      </div>
    );
  }

  const kunde = fahrzeug.kunde;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Wochenplan
        </Link>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h1 className="text-2xl font-bold font-mono tracking-wider">{fahrzeug.kennzeichen}</h1>
          <span className="text-sm text-muted-foreground">
            {[fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(" ") || "—"}
          </span>
        </div>
        {fahrzeug.chassis_nr && (
          <div className="text-xs text-muted-foreground font-mono mt-1">
            Chassis: {fahrzeug.chassis_nr}
          </div>
        )}
        {kunde?.name && (
          <div className="text-sm mt-2 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {kunde.kundennummer ? (
              <Link
                to={`/kunde/${encodeURIComponent(kunde.kundennummer)}`}
                className="hover:underline font-medium"
              >
                {kunde.name}
              </Link>
            ) : (
              <span className="font-medium">{kunde.name}</span>
            )}
            {kunde.kundennummer && (
              <span className="font-mono text-xs text-muted-foreground">#{kunde.kundennummer}</span>
            )}
            {kunde.telefon && (
              <a
                href={`tel:${kunde.telefon}`}
                className="text-xs text-primary hover:underline"
              >
                {kunde.telefon}
              </a>
            )}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Aufträge
            </div>
            <div className="text-2xl font-bold font-mono mt-1">{stats.anzahl}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5" /> Umsatz
            </div>
            <div className="text-xl font-bold font-mono mt-1 truncate">{chf(stats.umsatz)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Wrench className="h-3.5 w-3.5" /> Stunden
            </div>
            <div className="text-2xl font-bold font-mono mt-1">
              {stats.stunden.toLocaleString("de-CH", { maximumFractionDigits: 1 })} h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Letzter Service
            </div>
            <div className="text-base font-bold mt-1">
              {stats.letzter
                ? format(parseISO(stats.letzter), "d. MMM yyyy", { locale: de })
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service-Historie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" /> Service-Historie
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Keine Aufträge erfasst.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/auftrag/${r.id}`}
                    className="block px-4 py-3 hover:bg-muted/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">
                            {format(parseISO(r.geplantes_datum), "EEE, d. MMM yyyy", {
                              locale: de,
                            })}
                          </span>
                          <span className="font-mono text-xs font-semibold">
                            {r.rapport_nummer || "—"}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                              STATUS_CLS[r.status] ?? "bg-muted"
                            )}
                          >
                            {r.status}
                          </span>
                          {r.mechaniker_zuweisung && (
                            <span className="text-[10px] text-muted-foreground">
                              · {r.mechaniker_zuweisung}
                            </span>
                          )}
                        </div>
                        <div className="text-sm mt-1 truncate">
                          {kategorienLabels(r.kategorie) || (
                            <span className="text-muted-foreground italic">Kein Service-Typ</span>
                          )}
                        </div>
                        {r.notizen && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {r.notizen}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          {r.arbeitszeit_stunden != null && (
                            <div className="text-xs font-mono text-muted-foreground">
                              {r.arbeitszeit_stunden} h
                            </div>
                          )}
                          {r.auftragswert_chf != null && (
                            <div className="text-sm font-mono font-semibold">
                              {chf(r.auftragswert_chf)}
                            </div>
                          )}
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
