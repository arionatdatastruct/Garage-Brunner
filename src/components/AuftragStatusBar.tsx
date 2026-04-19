import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, Play, CheckCircle2, Archive } from "lucide-react";
import { ErledigenDialog } from "@/components/ErledigenDialog";

type Status = "geplant" | "in_arbeit" | "erledigt" | "archiviert";

const STATUS_LABEL: Record<Status, string> = {
  geplant: "Geplant",
  in_arbeit: "In Arbeit",
  erledigt: "Erledigt",
  archiviert: "Archiviert",
};

const STATUS_VARIANT: Record<Status, "secondary" | "default" | "outline"> = {
  geplant: "secondary",
  in_arbeit: "default",
  erledigt: "outline",
  archiviert: "outline",
};

interface Props {
  rapportId: string;
  status: Status;
  onChanged: () => void;
}

export function AuftragStatusBar({ rapportId, status, onChanged }: Props) {
  const [busy, setBusy] = useState<Status | null>(null);
  const [erledigenOpen, setErledigenOpen] = useState(false);
  const [erledigenRapport, setErledigenRapport] = useState<any>(null);

  const setStatus = async (next: Status) => {
    setBusy(next);
    try {
      const { error } = await (supabase as any)
        .from("arbeitsrapporte")
        .update({ status: next })
        .eq("id", rapportId);
      if (error) throw error;
      toast.success(`Status: ${STATUS_LABEL[next]}`);
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Fehler");
    } finally {
      setBusy(null);
    }
  };

  const openErledigen = async () => {
    setBusy("erledigt");
    try {
      const { data, error } = await (supabase as any)
        .from("arbeitsrapporte")
        .select("id, rapport_nummer, arbeitszeit_stunden, kategorie, sicherheitscheck")
        .eq("id", rapportId)
        .single();
      if (error) throw error;
      setErledigenRapport(data);
      setErledigenOpen(true);
    } catch (e: any) {
      toast.error(e.message ?? "Fehler");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={STATUS_VARIANT[status]} className="text-sm py-1 px-3">
        {STATUS_LABEL[status]}
      </Badge>

      {(status === "geplant" || status === "erledigt") && (
        <Button size="sm" onClick={() => setStatus("in_arbeit")} disabled={busy !== null}>
          {busy === "in_arbeit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          In Arbeit
        </Button>
      )}

      {(status === "geplant" || status === "in_arbeit") && (
        <Button size="sm" variant="default" onClick={openErledigen} disabled={busy !== null}>
          {busy === "erledigt" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Erledigt
        </Button>
      )}

      {status === "erledigt" && (
        <Button size="sm" variant="outline" onClick={() => setStatus("archiviert")} disabled={busy !== null}>
          {busy === "archiviert" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
          Archivieren
        </Button>
      )}

      {erledigenRapport && (
        <ErledigenDialog
          open={erledigenOpen}
          onOpenChange={setErledigenOpen}
          rapport={erledigenRapport}
          onDone={onChanged}
        />
      )}
    </div>
  );
}
