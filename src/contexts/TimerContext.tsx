import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ActiveTimer {
  rapportId: string;
  startedAt: number; // ms epoch
  label?: string;
}

interface TimerCtx {
  active: ActiveTimer | null;
  /** Laufende Sekunden für aktiven Timer (tickt jede Sekunde) */
  elapsedSec: number;
  isRunning: (rapportId: string) => boolean;
  start: (rapportId: string, label?: string) => void;
  /** Stoppt UND addiert die Stunden (gerundet auf 0.05h) zur DB. Gibt addierte Stunden zurück. */
  stopAndSave: (rapportId: string) => Promise<number | null>;
  /** Stoppt ohne zu speichern. */
  cancel: () => void;
}

const KEY = "garage:active-timer:v1";
const Ctx = createContext<TimerCtx | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveTimer | null>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ActiveTimer;
      if (parsed?.rapportId && typeof parsed.startedAt === "number") return parsed;
    } catch {}
    return null;
  });
  const [now, setNow] = useState(() => Date.now());
  const tickRef = useRef<number | null>(null);

  // Persist
  useEffect(() => {
    if (active) localStorage.setItem(KEY, JSON.stringify(active));
    else localStorage.removeItem(KEY);
  }, [active]);

  // Tick jede Sekunde solange aktiv
  useEffect(() => {
    if (!active) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [active]);

  const elapsedSec = active ? Math.max(0, Math.floor((now - active.startedAt) / 1000)) : 0;

  const isRunning = useCallback((id: string) => active?.rapportId === id, [active]);

  const start = useCallback((rapportId: string, label?: string) => {
    setActive((prev) => {
      if (prev && prev.rapportId !== rapportId) {
        toast.info("Anderer Timer wurde gestoppt", {
          description: "Es kann nur ein Timer gleichzeitig laufen.",
        });
      }
      return { rapportId, startedAt: Date.now(), label };
    });
  }, []);

  const cancel = useCallback(() => setActive(null), []);

  const stopAndSave = useCallback(
    async (rapportId: string): Promise<number | null> => {
      if (!active || active.rapportId !== rapportId) return null;
      const sec = Math.max(0, Math.floor((Date.now() - active.startedAt) / 1000));
      // auf 0.05h (3min) runden, mind. 0.05h wenn überhaupt gelaufen
      const hoursRaw = sec / 3600;
      const hours = Math.max(0.05, Math.round(hoursRaw * 20) / 20);
      try {
        const { data: cur, error: e1 } = await (supabase as any)
          .from("arbeitsrapporte")
          .select("arbeitszeit_stunden")
          .eq("id", rapportId)
          .single();
        if (e1) throw e1;
        const next = Number(((cur?.arbeitszeit_stunden ?? 0) + hours).toFixed(2));
        const { error: e2 } = await (supabase as any)
          .from("arbeitsrapporte")
          .update({ arbeitszeit_stunden: next })
          .eq("id", rapportId);
        if (e2) throw e2;
        setActive(null);
        toast.success(`+${hours.toLocaleString("de-CH", { maximumFractionDigits: 2 })}h erfasst`, {
          description: `Total: ${next.toLocaleString("de-CH", { maximumFractionDigits: 2 })}h`,
        });
        return hours;
      } catch (e: any) {
        toast.error(e.message ?? "Fehler beim Speichern");
        return null;
      }
    },
    [active]
  );

  const value = useMemo<TimerCtx>(
    () => ({ active, elapsedSec, isRunning, start, stopAndSave, cancel }),
    [active, elapsedSec, isRunning, start, stopAndSave, cancel]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTimer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}

export function formatTimer(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
