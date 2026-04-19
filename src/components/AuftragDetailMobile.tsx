import { useState } from "react";
import { Link } from "react-router-dom";
import { Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AuftragForm } from "@/components/AuftragForm";
import { SicherheitsCheck } from "@/components/SicherheitsCheck";
import { RapportUebersicht } from "@/components/RapportUebersicht";
import { BelegPreview } from "@/components/BelegPreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  MoreVertical,
  Pause,
  Play,
  Printer,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ErledigenDialog } from "@/components/ErledigenDialog";

type Status = "geplant" | "in_arbeit" | "erledigt" | "archiviert";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  auftragsnummer: string | null;
  status: Status;
  pdf_url: string | null;
  geplantes_datum: string;
  kategorie: string | null;
  arbeit_beschreibung: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  sicherheitscheck: Record<string, unknown> | null;
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  kunde_strasse: string | null;
  kunde_plz: string | null;
  kunde_telefon: string | null;
  kunde_email: string | null;
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
}

const STATUS_CFG: Record<Status, { label: string; cls: string; dot: string }> = {
  geplant: {
    label: "Geplant",
    cls: "bg-muted text-foreground",
    dot: "bg-muted-foreground/50",
  },
  in_arbeit: {
    label: "In Arbeit",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  erledigt: {
    label: "Erledigt",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  archiviert: {
    label: "Archiviert",
    cls: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

interface Props {
  rapport: Rapport;
  onChanged: () => void;
  onDelete: () => Promise<void>;
  deleting: boolean;
}

export function AuftragDetailMobile({ rapport, onChanged, onDelete, deleting }: Props) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [erledigenOpen, setErledigenOpen] = useState(false);
  const [erledigenRapport, setErledigenRapport] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [belegExpanded, setBelegExpanded] = useState(false);

  const isErledigt = rapport.status === "erledigt" || rapport.status === "archiviert";
  const sCfg = STATUS_CFG[rapport.status];

  const setStatus = async (next: Status) => {
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from("arbeitsrapporte")
        .update({ status: next })
        .eq("id", rapport.id);
      if (error) throw error;
      toast.success(`Status: ${STATUS_CFG[next].label}`);
      onChanged();
      setStatusOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const openErledigen = async () => {
    setBusy(true);
    try {
      const { data, error } = await (supabase as any)
        .from("arbeitsrapporte")
        .select("id, rapport_nummer, arbeitszeit_stunden, kategorie, sicherheitscheck")
        .eq("id", rapport.id)
        .single();
      if (error) throw error;
      setErledigenRapport(data);
      setErledigenOpen(true);
    } catch (e: any) {
      toast.error(e.message ?? "Fehler");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="md:hidden flex flex-col min-h-screen">
      {/* Sticky Top-Bar */}
      <header
        className="sticky top-[5.5rem] z-20 flex items-center gap-2 px-3 py-2 border-b border-border bg-card/95 backdrop-blur"
      >
        <Link
          to="/"
          className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground active:scale-95 transition"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-mono font-bold text-base truncate">
            {rapport.kennzeichen ?? "—"}
          </div>
          <div className="text-[11px] text-muted-foreground truncate font-mono">
            {rapport.auftragsnummer ?? rapport.rapport_nummer}
          </div>
        </div>
        {/* Status-Pill (tap zum Ändern) */}
        <DropdownMenu open={statusOpen} onOpenChange={setStatusOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={busy}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition",
                sCfg.cls
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", sCfg.dot)} />
              {sCfg.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {(["geplant", "in_arbeit"] as Status[]).map((s) => (
              <DropdownMenuItem
                key={s}
                disabled={rapport.status === s}
                onClick={() => setStatus(s)}
              >
                {s === "geplant" ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {STATUS_CFG[s].label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem disabled={isErledigt} onClick={openErledigen}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Erledigen…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Inhalt scrollbar */}
      <div className="flex-1 px-3 pt-3 pb-28 space-y-3">
        {/* Übersicht-Card */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fahrzeug</div>
              <div className="font-medium truncate">
                {[rapport.marke, rapport.modell].filter(Boolean).join(" ") || "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Kunde</div>
              <div className="font-medium truncate">{rapport.kunde_name ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Datum</div>
              <div className="font-medium font-mono">{rapport.geplantes_datum}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stunden</div>
              <div className="font-medium font-mono tabular-nums">
                {rapport.arbeitszeit_stunden ?? "—"}h
              </div>
            </div>
          </div>
          {rapport.kunde_telefon && (
            <a
              href={`tel:${rapport.kunde_telefon}`}
              className="mt-3 flex items-center justify-center gap-2 h-10 rounded-md bg-primary/10 text-primary text-sm font-medium active:scale-95 transition"
            >
              📞 {rapport.kunde_telefon}
            </a>
          )}
        </div>

        {/* Akkordeon */}
        <Accordion type="multiple" defaultValue={["form"]} className="space-y-3">
          <AccordionItem value="form" className="border-0 rounded-xl bg-transparent">
            <AccordionTrigger className="px-3 py-3 rounded-xl border border-border bg-card hover:no-underline data-[state=open]:rounded-b-none">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4 text-primary" /> Daten bearbeiten
              </span>
            </AccordionTrigger>
            <AccordionContent className="border border-t-0 border-border rounded-b-xl bg-card -mt-px">
              <div className="p-1">
                <AuftragForm rapport={rapport} onSaved={onChanged} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="check" className="border-0 rounded-xl bg-transparent">
            <AccordionTrigger className="px-3 py-3 rounded-xl border border-border bg-card hover:no-underline data-[state=open]:rounded-b-none">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" /> Sicherheitscheck
              </span>
            </AccordionTrigger>
            <AccordionContent className="border border-t-0 border-border rounded-b-xl bg-card -mt-px">
              <div className="p-1">
                <SicherheitsCheck
                  rapportId={rapport.id}
                  initial={rapport.sicherheitscheck}
                  onSaved={onChanged}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {isErledigt && (
            <AccordionItem value="ueber" className="border-0 rounded-xl bg-transparent">
              <AccordionTrigger className="px-3 py-3 rounded-xl border border-border bg-card hover:no-underline data-[state=open]:rounded-b-none">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-primary" /> Rapport-Übersicht
                </span>
              </AccordionTrigger>
              <AccordionContent className="border border-t-0 border-border rounded-b-xl bg-card -mt-px">
                <div className="p-2">
                  <RapportUebersicht rapport={rapport as any} />
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="beleg" className="border-0 rounded-xl bg-transparent">
            <AccordionTrigger className="px-3 py-3 rounded-xl border border-border bg-card hover:no-underline data-[state=open]:rounded-b-none">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" /> Original-Beleg (PDF)
              </span>
            </AccordionTrigger>
            <AccordionContent className="border border-t-0 border-border rounded-b-xl bg-card -mt-px">
              <div className="p-2 min-h-[60vh]">
                <BelegPreview pdfUrl={rapport.pdf_url} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Sticky Bottom Action-Bar */}
      <div
        className="fixed bottom-14 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur px-3 py-2.5 flex gap-2"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      >
        <Button
          className="flex-1 h-12 text-base"
          onClick={openErledigen}
          disabled={busy || isErledigt}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          {isErledigt ? "Erledigt" : "Auftrag erledigen"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-12 w-12">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {rapport.pdf_url && (
              <DropdownMenuItem asChild>
                <a href={rapport.pdf_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" /> Beleg öffnen
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Drucken
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Erledigen-Dialog */}
      {erledigenRapport && (
        <ErledigenDialog
          open={erledigenOpen}
          onOpenChange={setErledigenOpen}
          rapport={erledigenRapport}
          onDone={onChanged}
        />
      )}

      {/* Löschen-Dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={(o) => !o && !deleting && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auftrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {rapport.rapport_nummer} wird unwiderruflich gelöscht — inkl. PDF und Fotos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
