import { Loader2, Play, Square } from "lucide-react";
import { useState } from "react";
import { useTimer, formatTimer } from "@/contexts/TimerContext";
import { cn } from "@/lib/utils";

interface Props {
  rapportId: string;
  label?: string;
  variant?: "compact" | "full";
  className?: string;
  /** Nach Stop callback (z.B. zum Reload) */
  onStopped?: () => void;
}

export function TimerButton({ rapportId, label, variant = "compact", className, onStopped }: Props) {
  const { isRunning, elapsedSec, start, stopAndSave } = useTimer();
  const running = isRunning(rapportId);
  const [busy, setBusy] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (running) {
      setBusy(true);
      await stopAndSave(rapportId);
      setBusy(false);
      onStopped?.();
    } else {
      start(rapportId, label);
    }
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={busy}
        aria-label={running ? "Timer stoppen" : "Timer starten"}
        className={cn(
          "h-9 px-2 inline-flex items-center gap-1 rounded-md text-xs font-mono font-semibold tabular-nums transition active:scale-95",
          running
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          className
        )}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : running ? (
          <Square className="h-3 w-3 fill-current" />
        ) : (
          <Play className="h-3 w-3 fill-current" />
        )}
        {running && <span>{formatTimer(elapsedSec)}</span>}
      </button>
    );
  }

  // full
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "h-12 px-4 inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-95",
        running
          ? "bg-emerald-500 text-white"
          : "bg-muted text-foreground hover:bg-muted/70",
        className
      )}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : running ? (
        <>
          <Square className="h-4 w-4 fill-current" />
          <span className="font-mono tabular-nums">{formatTimer(elapsedSec)}</span>
          <span className="text-xs opacity-80">Stopp</span>
        </>
      ) : (
        <>
          <Play className="h-4 w-4 fill-current" />
          Timer starten
        </>
      )}
    </button>
  );
}
