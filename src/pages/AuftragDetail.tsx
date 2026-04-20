import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuftragStatusBar } from "@/components/AuftragStatusBar";
import { AuftragForm } from "@/components/AuftragForm";
import { SicherheitsCheck } from "@/components/SicherheitsCheck";
import { BelegMitRapport } from "@/components/BelegMitRapport";
import { AuftragDetailMobile } from "@/components/AuftragDetailMobile";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

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
  const navigate = useNavigate();
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const isMobile = useIsMobile();

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      // Storage-Dateien im Ordner <rapport.id>/ löschen (belege + fotos)
      for (const bucket of ["belege", "fotos"] as const) {
        const { data: files } = await supabase.storage.from(bucket).list(id);
        if (files && files.length > 0) {
          await supabase.storage
            .from(bucket)
            .remove(files.map((f) => `${id}/${f.name}`));
        }
      }
      const { error } = await (supabase as any)
        .from("arbeitsrapporte")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Auftrag gelöscht");
      navigate("/");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Fehler beim Löschen");
      setDeleting(false);
    }
  };

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
    <div className="w-full h-full min-h-[60vh] overflow-y-auto pr-1">
      <BelegMitRapport rapport={rapport} />
    </div>
  );

  // Mobile: komplett eigene Ansicht
  if (isMobile) {
    return (
      <AuftragDetailMobile
        rapport={rapport}
        onChanged={load}
        onDelete={handleDelete}
        deleting={deleting}
      />
    );
  }

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
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{fahrzeugLabel}</span>
            {rapport.kennzeichen && (
              <Link
                to={`/fahrzeug/${encodeURIComponent(rapport.kennzeichen)}`}
                className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                title="Service-Historie dieses Fahrzeugs"
              >
                Historie →
              </Link>
            )}
            {rapport.kunde_name && <span>· {rapport.kunde_name}</span>}
            {rapport.kundennummer && (
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">
                #{rapport.kundennummer}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AuftragStatusBar rapportId={rapport.id} status={rapport.status} onChanged={load} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Auftrag löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  {rapport.rapport_nummer} wird unwiderruflich gelöscht — inkl. PDF und Fotos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Desktop: Split-View */}
      <div className="hidden md:grid md:grid-cols-5 md:gap-4 md:h-[calc(100vh-8rem)]">
        <div className="md:col-span-3 overflow-hidden">
          <PdfPane />
        </div>
        <div className="md:col-span-2 overflow-y-auto pr-1 space-y-4">
          <AuftragForm rapport={rapport} onSaved={load} />
          <SicherheitsCheck
            rapportId={rapport.id}
            initial={rapport.sicherheitscheck}
            onSaved={load}
          />
        </div>
      </div>
    </div>
  );
}
