import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuftragStatusBar } from "@/components/AuftragStatusBar";
import { AuftragForm } from "@/components/AuftragForm";
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
import { ArrowLeft, FileText, Loader2, Printer, Trash2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DruckvorschauDialog } from "@/components/DruckvorschauDialog";
import {
  RAPPORT_SELECT_FULL,
  fzKennzeichen, fzMarke, fzModell,
  kdName, kdNummer,
  type FahrzeugRel,
} from "@/lib/rapport-relations";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  status: "geplant" | "in_arbeit" | "erledigt" | "archiviert";
  pdf_url: string | null;
  geplantes_datum: string;
  kategorie: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  sicherheitscheck: Record<string, unknown> | null;
  fahrzeug_id: string | null;
  fahrzeug: FahrzeugRel | null;
  fotos?: string[] | null;
}

export default function AuftragDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const isMobile = useIsMobile();
  const [druckOpen, setDruckOpen] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
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
      .select(RAPPORT_SELECT_FULL)
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

  const kennzeichen = fzKennzeichen(rapport);
  const fahrzeugLabel = [kennzeichen, fzMarke(rapport), fzModell(rapport)]
    .filter(Boolean)
    .join(" · ") || "—";
  const kundeName = kdName(rapport);
  const kundeNummer = kdNummer(rapport);

  const PdfPane = () => (
    <div className="w-full h-full min-h-[60vh] overflow-y-auto pr-1">
      <BelegMitRapport rapport={rapport} />
    </div>
  );

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
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4">
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
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{fahrzeugLabel}</span>
            {kennzeichen && (
              <Link
                to={`/fahrzeug/${encodeURIComponent(kennzeichen)}`}
                className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                title="Service-Historie dieses Fahrzeugs"
              >
                Historie →
              </Link>
            )}
            {kundeName && <span>· {kundeName}</span>}
            {kundeNummer && (
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">
                #{kundeNummer}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AuftragStatusBar rapportId={rapport.id} status={rapport.status} onChanged={load} />
          {/* Druckvorschau nur auf Desktop – auf Tablet/Handy zu wenig Platz */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDruckOpen(true)}
            title="Druckvorschau"
            className="hidden lg:inline-flex"
          >
            <Printer className="h-4 w-4" />
          </Button>
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

      {/* Formular immer sichtbar; PDF-Vorschau nur auf Desktop (lg+) daneben */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <AuftragForm rapport={rapport} onSaved={load} />

          {/* Tablet: Original-Beleg als Accordion (Desktop zeigt PDF-Pane rechts) */}
          <div className="lg:hidden">
            <Accordion type="single" collapsible>
              <AccordionItem value="beleg" className="border-0 rounded-xl bg-transparent">
                <AccordionTrigger className="px-3 py-3 rounded-xl border border-border bg-card hover:no-underline data-[state=open]:rounded-b-none">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-primary" /> Original-Beleg prüfen
                  </span>
                </AccordionTrigger>
                <AccordionContent className="border border-t-0 border-border rounded-b-xl bg-card -mt-px">
                  <div className="p-2 overflow-x-auto">
                    <BelegMitRapport rapport={rapport} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
        <div className="hidden lg:block sticky top-4 min-w-0">
          <PdfPane />
        </div>
      </div>

      <DruckvorschauDialog open={druckOpen} onOpenChange={setDruckOpen} rapport={rapport} />
    </div>
  );
}
