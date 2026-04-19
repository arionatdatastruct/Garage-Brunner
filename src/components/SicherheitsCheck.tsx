import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Check, ShieldCheck, AlertTriangle } from "lucide-react";
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
type SaveState = "idle" | "saving" | "saved";

const DOT: Record<Status, string> = {
  "": "bg-muted-foreground/30",
  gruen: "bg-emerald-500",
  gelb: "bg-amber-500",
  rot: "bg-red-500",
};

const BTN_ACTIVE: Record<Exclude<Status, "">, string> = {
  gruen: "bg-emerald-500 text-white border-emerald-500 shadow-sm",
  gelb: "bg-amber-500 text-white border-amber-500 shadow-sm",
  rot: "bg-red-500 text-white border-red-500 shadow-sm",
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
      s[c.key] = (initial?.[c.key] as Status) ?? "";
    });
    return s;
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync wenn parent neu lädt
  useEffect(() => {
    const s: State = {};
    CHECKS.forEach((c) => {
      s[c.key] = (initial?.[c.key] as Status) ?? "";
    });
    setState(s);
    dirty.current = false;
  }, [initial]);

  // Auto-Save
  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(async () => {
      try {
        const { error } = await (supabase as any)
          .from("arbeitsrapporte")
          .update({ sicherheitscheck: state })
          .eq("id", rapportId);
        if (error) throw error;
        setSaveState("saved");
        onSaved();
        setTimeout(() => setSaveState("idle"), 1500);
      } catch (e: any) {
        setSaveState("idle");
        toast.error(e.message ?? "Fehler beim Speichern");
      }
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const set = (key: string, status: Status) => {
    dirty.current = true;
    setState((prev) => ({ ...prev, [key]: prev[key] === status ? "" : status }));
  };

  const counts = Object.values(state).reduce(
    (a, v) => {
      if (v === "rot") a.rot++;
      else if (v === "gelb") a.gelb++;
      else if (v === "gruen") a.gruen++;
      return a;
    },
    { gruen: 0, gelb: 0, rot: 0 }
  );
  const hasRot = counts.rot > 0;

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn("h-4 w-4", hasRot ? "text-destructive" : "text-primary")} />
          <h3 className="text-sm font-semibold uppercase tracking-wider">Sicherheitscheck</h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full transition-all",
            saveState === "saving" && "bg-amber-500/15 text-amber-500",
            saveState === "saved" && "bg-emerald-500/15 text-emerald-500",
            saveState === "idle" && "text-muted-foreground/60"
          )}
        >
          {saveState === "saving" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Speichert
            </>
          ) : saveState === "saved" ? (
            <>
              <Check className="h-3 w-3" /> Gespeichert
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              Bereit
            </>
          )}
        </span>
      </div>

      {/* Achtung-Banner bei Rot */}
      {hasRot && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-xs font-medium border-b border-destructive/20">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {counts.rot} {counts.rot === 1 ? "Mangel" : "Mängel"} festgestellt
        </div>
      )}

      {/* Check-Liste */}
      <div className="p-4 space-y-1">
        {CHECKS.map((c) => {
          const current = state[c.key];
          return (
            <div
              key={c.key}
              className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-b-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 transition-colors", DOT[current])} />
                <span className="text-sm truncate">{c.label}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                {(["gruen", "gelb", "rot"] as const).map((s) => {
                  const isActive = current === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set(c.key, s)}
                      aria-pressed={isActive}
                      className={cn(
                        "h-7 w-7 rounded-md border border-border bg-background hover:bg-muted transition flex items-center justify-center",
                        isActive && BTN_ACTIVE[s]
                      )}
                      title={s === "gruen" ? "OK" : s === "gelb" ? "Beobachten" : "Mangel"}
                    >
                      {isActive ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : (
                        <span className={cn("h-2 w-2 rounded-full", DOT[s])} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer mit Zusammenfassung */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-border text-xs text-muted-foreground">
        <span>
          {CHECKS.length - counts.gruen - counts.gelb - counts.rot} offen
        </span>
        <div className="flex items-center gap-3 font-mono tabular-nums">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {counts.gruen}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {counts.gelb}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {counts.rot}
          </span>
        </div>
      </div>
    </div>
  );
}
