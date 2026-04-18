import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuftragStatusBar } from "@/components/AuftragStatusBar";
import { AuftragForm } from "@/components/AuftragForm";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";

interface Fahrzeug {
  id: string;
  kennzeichen: string;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
  kunde_id: string | null;
}

interface Kunde {
  id: string;
  name: string;
  ort: string | null;
  telefon: string | null;
  email: string | null;
}

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  auftragsnummer: string | null;
  status: "geplant" | "in_arbeit" | "erledigt" | "archiviert";
  pdf_url: string | null;
  geplantes_datum: string;
  kategorie: string | null;
  km_stand: number | null;
  arbeit_beschreibung: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  fahrzeug_id: string | null;
}

export default function AuftragDetail() {
  const { id } = useParams();
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [fahrzeug, setFahrzeug] = useState<Fahrzeug | null>(null);
  const [kunde, setKunde] = useState<Kunde | null>(null);
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

    if (rap.fahrzeug_id) {
      const { data: fz } = await (supabase as any)
        .from("fahrzeuge")
        .select("*")
        .eq("id", rap.fahrzeug_id)
        .single();
      setFahrzeug(fz as Fahrzeug);
      if (fz?.kunde_id) {
        const { data: ku } = await (supabase as any)
          .from("kunden")
          .select("*")
          .eq("id", fz.kunde_id)
          .single();
        setKunde(ku as Kunde);
      }
    }
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

  // Realtime auf Fahrzeug & Kunde (n8n schreibt dort auch)
  useEffect(() => {
    if (!fahrzeug?.id) return;
    const ch = supabase
      .channel(`fz-${fahrzeug.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "fahrzeuge", filter: `id=eq.${fahrzeug.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fahrzeug?.id, load]);

  useEffect(() => {
    if (!kunde?.id) return;
    const ch = supabase
      .channel(`ku-${kunde.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "kunden", filter: `id=eq.${kunde.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [kunde?.id, load]);

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

  const fahrzeugLabel = fahrzeug
    ? [fahrzeug.kennzeichen, fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(" · ")
    : "—";

  const PdfPane = () =>
    rapport.pdf_url ? (
      <iframe
        src={rapport.pdf_url}
        title="Beleg"
        className="w-full h-full min-h-[60vh] rounded-md border border-border bg-muted"
      />
    ) : (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground border border-dashed border-border rounded-md">
        <FileText className="h-8 w-8 mb-2" />
        Kein PDF
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
            {kunde?.name && kunde.name !== "(wird ergänzt)" && ` · ${kunde.name}`}
          </p>
        </div>
        <AuftragStatusBar rapportId={rapport.id} status={rapport.status} onChanged={load} />
      </div>

      {/* Desktop: Split-View */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-12rem)]">
        <div className="overflow-hidden">
          <PdfPane />
        </div>
        <div className="overflow-y-auto pr-1">
          <AuftragForm rapport={rapport} kunde={kunde} onSaved={load} />
        </div>
      </div>

      {/* Mobile: Tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="daten">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="daten">Daten</TabsTrigger>
            <TabsTrigger value="beleg">Beleg</TabsTrigger>
          </TabsList>
          <TabsContent value="daten" className="mt-3">
            <AuftragForm rapport={rapport} kunde={kunde} onSaved={load} />
          </TabsContent>
          <TabsContent value="beleg" className="mt-3 h-[70vh]">
            <PdfPane />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
