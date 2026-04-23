import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { BelegMitRapport } from "@/components/BelegMitRapport";
import { FotoHinzufuegen } from "@/components/FotoHinzufuegen";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  MoreVertical,
  Pause,
  Phone,
  Play,
  Printer,
  Trash2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ErledigenDialog } from "@/components/ErledigenDialog";
import { useWakeLock } from "@/hooks/useWakeLock";
import { toSignedUrl } from "@/lib/storage";
import { KundeLinkPicker } from "@/components/KundeLinkPicker";
import {
  fzKennzeichen, fzMarke, fzModell,
  kdName, kdTelefon,
  type FahrzeugRel,
} from "@/lib/rapport-relations";

type Status = "geplant" | "in_arbeit" | "erledigt" | "archiviert";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  status: Status;
  pdf_url: string | null;
  geplantes_datum: string;
  kategorie: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  sicherheitscheck: Record<string, unknown> | null;
  fahrzeug_id: string | null;
  fahrzeug?: FahrzeugRel | null;
  fotos?: string[] | null;
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
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);

  const isErledigt = rapport.status === "erledigt" || rapport.status === "archiviert";
  const sCfg = STATUS_CFG[rapport.status];

  useWakeLock(!isErledigt);

  useEffect(() => {
    let active = true;
    void (async () => {
      const signed = await Promise.all((rapport.fotos ?? []).map(async (value) => (await toSignedUrl(value)) ?? value));
      if (active) setFotoUrls(signed.filter(Boolean));
    })();
    return () => {
      active = false;
    };
  }, [rapport.fotos]);

  const kennzeichen = fzKennzeichen(rapport);
  const marke = fzMarke(rapport);
  const modell = fzModell(rapport);
  const kundeName = kdName(rapport);
  const kundeTel = kdTelefon(rapport);

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
      <header className="px-3 pt-2 pb-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="h-11 w-11 -ml-1 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground active:scale-95 transition shrink-0"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="font-mono font-bold text-xl tracking-tight leading-none truncate">
              {kennzeichen ?? "—"}
            </div>
            <div className="text-sm text-muted-foreground truncate mt-1">
              {[marke, modell].filter(Boolean).join(" ") || "—"}
            </div>
          </div>
          <DropdownMenu open={statusOpen} onOpenChange={setStatusOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={busy}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-semibold active:scale-95 transition shrink-0",
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
        </div>
        {kundeName && (
          <div className="text-base font-semibold mt-2 truncate pl-12">
            {kundeName}
          </div>
        )}
      </header>

      <div
        className="flex-1 px-3 pt-3 space-y-3 overflow-y-auto"
        style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="font-mono px-2 py-1.5 rounded bg-muted">
            📅 {rapport.geplantes_datum}
          </span>
          <span className="font-mono px-2 py-1.5 rounded bg-muted tabular-nums">
            ⏱ {rapport.arbeitszeit_stunden ?? "—"}h
          </span>
          {kundeTel && (
            <a
              href={`tel:${kundeTel}`}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium active:scale-95 transition"
            >
              <Phone className="h-3.5 w-3.5" /> Anrufen
            </a>
          )}
        </div>

        <FotoHinzufuegen
          rapportId={rapport.id}
          currentFotos={rapport.fotos}
          onUploaded={onChanged}
        />

        {fotoUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 snap-x snap-mandatory">
            {fotoUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 h-24 w-24 rounded-lg overflow-hidden border border-border bg-muted snap-start"
              >
                <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        )}

        <Accordion type="multiple" defaultValue={["form"]} className="space-y-3">
          <AccordionItem value="form" className="border-0 rounded-xl bg-transparent">
            <AccordionTrigger className="px-3 py-3 rounded-xl border border-border bg-card hover:no-underline data-[state=open]:rounded-b-none">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4 text-primary" /> Auftrag bearbeiten
              </span>
            </AccordionTrigger>
            <AccordionContent className="border border-t-0 border-border rounded-b-xl bg-card -mt-px">
              <div className="p-3">
                <AuftragForm rapport={rapport} onSaved={onChanged} />
              </div>
            </AccordionContent>
          </AccordionItem>

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

      <div
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur px-3 py-2.5 flex gap-2"
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
          {isErledigt ? "Erledigt" : "Erledigen"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-12 w-12">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48">
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

      {erledigenRapport && (
        <ErledigenDialog
          open={erledigenOpen}
          onOpenChange={setErledigenOpen}
          rapport={erledigenRapport}
          onDone={onChanged}
        />
      )}

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
