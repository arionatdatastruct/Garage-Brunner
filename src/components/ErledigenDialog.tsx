import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseKategorien } from "@/lib/kategorien";

interface RapportLite {
  id: string;
  rapport_nummer: string | null;
  arbeitszeit_stunden: number | null;
  kategorie: string | null;
  sicherheitscheck: Record<string, unknown> | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rapport: RapportLite;
  onDone: () => void;
}

export function ErledigenDialog({ open, onOpenChange, rapport, onDone }: Props) {
  const [busy, setBusy] = useState(false);

  const checks = useMemo(() => {
    const stundenOk =
      rapport.arbeitszeit_stunden != null && rapport.arbeitszeit_stunden > 0;
    const kategorieOk = parseKategorien(rapport.kategorie).length > 0;
    const sc = rapport.sicherheitscheck;
    const sicherheitOk =
      sc != null && typeof sc === "object" && Object.keys(sc).length > 0;
    return [
      { ok: stundenOk, label: "Arbeitszeit (Stunden) erfasst" },
      { ok: kategorieOk, label: "Kategorie zugewiesen" },
      { ok: sicherheitOk, label: "Sicherheitscheck ausgefüllt" },
    ];
  }, [rapport]);

  const allOk = checks.every((c) => c.ok);

  const confirm = async () => {
    if (!allOk) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from("arbeitsrapporte")
        .update({ status: "erledigt" })
        .eq("id", rapport.id);
      if (error) throw error;
      toast.success("Auftrag als erledigt markiert");
      onDone();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Fehler");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Auftrag {rapport.rapport_nummer ?? ""} als erledigt markieren?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {allOk
              ? "Alle Pflichtfelder sind ausgefüllt."
              : "Bitte zuerst folgende Pflichtfelder ausfüllen:"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-2 text-sm">
          {checks.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              {c.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
              <span className={c.ok ? "text-muted-foreground" : "text-foreground"}>
                {c.label}
              </span>
            </li>
          ))}
        </ul>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirm();
            }}
            disabled={!allOk || busy}
          >
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Erledigt
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
