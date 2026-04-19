import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuftragStatusBar } from "@/components/AuftragStatusBar";
import { AuftragForm } from "@/components/AuftragForm";
import { SicherheitsCheck } from "@/components/SicherheitsCheck";
import { RapportUebersicht } from "@/components/RapportUebersicht";
import { BelegPreview } from "@/components/BelegPreview";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  auftragsnummer: string | null;
  status: "geplant" | "in_arbeit" | "erledigt" | "archiviert";
  pdf_url: string | null;
  geplantes_datum: string;
  kategorie: string | null;
  arbeit_beschreibung: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  sicherheitscheck: Record<string, unknown> | null;
  // Snapshot Kunde
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  kunde_strasse: string | null;
  kunde_plz: string | null;
  kunde_telefon: string | null;
  kunde_email: string | null;
  // Snapshot Fahrzeug
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
}

export default function AuftragDetail() {
  const { id } = useParams();
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: rap, error } = await (supabase as any)
      .from("arbeitsrapporte")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !rap) {
      setLoading(false);
      return;
    }
    setRapport(rap as Rapport);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: n8n schreibt -> Felder live aktualisieren
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`rapport-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "arbeitsrapporte", filter: `id=eq.${id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Lade…
      </div>
    );
  }

  if (!rapport) {
    return (
      <div className="p-6">
        <Link to="/" className="text-sm text-primary underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Zurück
        </Link>
        <p className="mt-4">Auftrag nicht gefunden.</p>
      </div>
    );
  }

  const fahrzeugLabel = [rapport.kennzeichen, rapport.marke, rapport.modell]
    .filter(Boolean)
    .join(" · ") || "—";

  const isErledigt = rapport.status === "erledigt" || rapport.status === "archiviert";

  const PdfPane = () => (
    <div className="w-full h-full min-h-[60vh] flex flex-col gap-3">
      {isErledigt && <RapportUebersicht rapport={rapport} />}
      <BelegPreview pdfUrl={rapport.pdf_url} />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Wochenplan
          </Link>
          <h1 className="text-2xl font-bold mt-1">
            {rapport.rapport_nummer ?? "Rapport"}
            {rapport.auftragsnummer && (
              <span className="text-muted-foreground text-base font-normal ml-2">
                · Auftrag {rapport.auftragsnummer}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fahrzeugLabel}
            {rapport.kunde_name && ` · ${rapport.kunde_name}`}
            {rapport.kundennummer && (
              <span className="ml-2 font-mono text-xs px-1.5 py-0.5 rounded bg-muted">
                #{rapport.kundennummer}
              </span>
            )}
          </p>
        </div>
        <AuftragStatusBar rapportId={rapport.id} status={rapport.status} onChanged={load} />
      </div>

      {/* Desktop: Split-View */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-12rem)]">
        <div className="overflow-hidden">
          <PdfPane />
        </div>
        <div className="overflow-y-auto pr-1 space-y-4">
          <AuftragForm rapport={rapport} onSaved={load} />
          <SicherheitsCheck
            rapportId={rapport.id}
            initial={rapport.sicherheitscheck}
            onSaved={load}
          />
        </div>
      </div>

      {/* Mobile: Tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="daten">
          <TabsList className="sticky top-12 z-20 grid grid-cols-2 w-full bg-card/95 backdrop-blur border border-border h-11">
            <TabsTrigger value="daten" className="text-sm">Daten</TabsTrigger>
            <TabsTrigger value="beleg" className="text-sm">Beleg</TabsTrigger>
          </TabsList>
          <TabsContent value="daten" className="mt-3 space-y-4">
            <AuftragForm rapport={rapport} onSaved={load} />
            <SicherheitsCheck
              rapportId={rapport.id}
              initial={rapport.sicherheitscheck}
              onSaved={load}
            />
          </TabsContent>
          <TabsContent value="beleg" className="mt-3 min-h-[75vh]">
            <PdfPane />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
