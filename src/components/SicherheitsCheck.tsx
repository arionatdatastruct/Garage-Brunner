import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const CHECKS = [
  { key: "bremsen_vorne", label: "Bremsen vorne" },
  { key: "bremsen_hinten", label: "Bremsen hinten" },
  { key: "beleuchtung", label: "Beleuchtung" },
  { key: "fluessigkeiten", label: "Flüssigkeitsstände" },
  { key: "unterboden", label: "Unterboden / Auspuff" },
] as const;

type Status = "" | "gruen" | "gelb" | "rot";
type State = Record<string, Status>;

const DOT: Record<Status, string> = {
  "": "bg-muted border border-border",
  gruen: "bg-emerald-500",
  gelb: "bg-amber-500",
  rot: "bg-red-500",
};

const BTN: Record<Exclude<Status, "">, string> = {
  gruen: "data-[active=true]:bg-emerald-500 data-[active=true]:text-white data-[active=true]:border-emerald-500",
  gelb: "data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500",
  rot: "data-[active=true]:bg-red-500 data-[active=true]:text-white data-[active=true]:border-red-500",
};

interface Props {
  rapportId: string;
  initial: Record<string, unknown> | null;
  onSaved: () => void;
}

export function SicherheitsCheck({ rapportId, initial, onSaved }: Props) {
  const [state, setState] = useState<State>(() => {
    const s: State = {};
    CHECKS.forEach((c) => {
      const v = (initial?.[c.key] as Status) ?? "";
      s[c.key] = v;
    });
    return s;
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s: State = {};
    CHECKS.forEach((c) => {
      s[c.key] = (initial?.[c.key] as Status) ?? "";
    });
    setState(s);
  }, [initial]);

  const set = (key: string, status: Status) => {
    setState((prev) => ({ ...prev, [key]: prev[key] === status ? "" : status }));
  };

  const save = async () => {
    setBusy(true);
    try {
      const ampel = Object.values(state).includes("rot")
        ? "rot"
        : Object.values(state).includes("gelb")
          ? "gelb"
          : Object.values(state).some((v) => v === "gruen")
            ? "gruen"
            : null;
      const { error } = await (supabase as any)
        .from("arbeitsrapporte")
        .update({ sicherheitscheck: state, ampel_status: ampel })
        .eq("id", rapportId);
      if (error) throw error;
      toast.success("Sicherheitscheck gespeichert");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const hasRot = Object.values(state).includes("rot");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Sicherheitscheck</span>
          {hasRot && (
            <span className="inline-flex items-center gap-1 text-xs text-red-500 font-normal">
              <AlertTriangle className="h-3.5 w-3.5" /> Achtung
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {CHECKS.map((c) => (
          <div
            key={c.key}
            className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-b-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", DOT[state[c.key]])} />
              <span className="text-sm truncate">{c.label}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              {(["gruen", "gelb", "rot"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  data-active={state[c.key] === s}
                  onClick={() => set(c.key, s)}
                  className={cn(
                    "h-7 w-7 rounded border border-border bg-background hover:bg-muted transition flex items-center justify-center",
                    BTN[s]
                  )}
                  title={s === "gruen" ? "OK" : s === "gelb" ? "Beobachten" : "Mangel"}
                >
                  <span className={cn("h-2 w-2 rounded-full", DOT[s])} />
                </button>
              ))}
            </div>
          </div>
        ))}

        <Button onClick={save} disabled={busy} variant="outline" className="w-full mt-3">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sicherheitscheck speichern
        </Button>
      </CardContent>
    </Card>
  );
}
