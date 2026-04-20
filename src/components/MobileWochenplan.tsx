import { useRef } from "react";
import { format, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { kapazitaetFuer, auslastungsFarbe } from "@/lib/arbeitszeiten";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { KategorieBadges } from "@/components/KategorieBadges";
import { MoreVertical, Phone } from "lucide-react";
import { FotoQuickAdd } from "@/components/FotoQuickAdd";
import { TimerButton } from "@/components/TimerButton";
import { useTimer, formatTimer } from "@/contexts/TimerContext";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  auftragsnummer: string | null;
  geplantes_datum: string;
  status: string;
  mechaniker_zuweisung: string | null;
  arbeitszeit_stunden: number | null;
  kategorie: string | null;
  kennzeichen: string | null;
  marke: string | null;
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_telefon?: string | null;
  fotos?: string[] | null;
}

const MECH_DOT: Record<string, string> = {
  Roman: "bg-blue-500",
  Pascal: "bg-emerald-500",
};

const STATUS_BAR: Record<string, string> = {
  geplant: "bg-muted-foreground/30",
  in_arbeit: "bg-amber-500",
  erledigt: "bg-emerald-500",
};

const STATUS_LABEL: Record<string, string> = {
  geplant: "Geplant",
  in_arbeit: "In Arbeit",
  erledigt: "Erledigt",
};

interface CardProps {
  r: Rapport;
  highlight?: boolean;
  overdue?: boolean;
  onAction: (r: Rapport) => void;
  onChanged?: () => void;
}

function MobileCard({ r, highlight, overdue, onAction, onChanged }: CardProps) {
  const navigate = useNavigate();
  const { isRunning, elapsedSec } = useTimer();
  const running = isRunning(r.id);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const startPress = () => {
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      // Haptik wenn verfügbar
      if ("vibrate" in navigator) navigator.vibrate(15);
      onAction(r);
    }, 280);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (longPressed.current) return;
    navigate(`/auftrag/${r.id}`);
  };

  return (
    <div
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onClick={handleClick}
      data-rapport-id={r.id}
      className={cn(
        "relative bg-card border border-border rounded-xl p-3 pl-4 transition-all select-none",
        "active:scale-[0.98] active:bg-muted",
        overdue && "border-destructive/60 bg-destructive/5",
        running && "ring-2 ring-emerald-500/60 border-emerald-500/40",
        highlight && "ring-2 ring-primary border-primary animate-pulse"
      )}
      style={{ touchAction: "manipulation" }}
    >
      {/* Status-Strich links (4px für Touch) */}
      <div
        className={cn(
          "absolute left-0 top-2 bottom-2 w-1 rounded-r",
          running ? "bg-emerald-500" : (STATUS_BAR[r.status] ?? "bg-muted-foreground/30")
        )}
        aria-hidden
      />

      {/* Zeile 1: Kennzeichen + Stunden + Action-Knopf */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-bold text-base tracking-tight truncate">
            {r.kennzeichen ?? "—"}
          </span>
          {r.mechaniker_zuweisung && (
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                MECH_DOT[r.mechaniker_zuweisung] ?? "bg-muted-foreground"
              )}
              title={r.mechaniker_zuweisung}
            />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {running ? (
            <span className="text-xs font-mono font-semibold tabular-nums px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              ▶ {formatTimer(elapsedSec)}
            </span>
          ) : (
            <span
              className={cn(
                "text-sm font-mono font-semibold tabular-nums px-2 py-0.5 rounded",
                r.arbeitszeit_stunden && r.arbeitszeit_stunden > 0
                  ? "bg-muted text-foreground"
                  : "bg-muted/50 text-muted-foreground/60"
              )}
            >
              {r.arbeitszeit_stunden && r.arbeitszeit_stunden > 0
                ? `${r.arbeitszeit_stunden.toLocaleString("de-CH", { maximumFractionDigits: 2 })}h`
                : "— h"}
            </span>
          )}
          <TimerButton rapportId={r.id} label={r.kennzeichen ?? undefined} onStopped={onChanged} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cancelPress();
              onAction(r);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-9 w-9 -mr-1 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition"
            aria-label="Aktionen"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Zeile 2: Marke · Kunde + Quick Actions (Anrufen + Foto) */}
      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground truncate flex-1 min-w-0">
          {r.marke ?? "Kein Fahrzeug"}
          {r.kunde_name && <span className="mx-1.5">·</span>}
          {r.kunde_name}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {r.kunde_telefon && (
            <a
              href={`tel:${r.kunde_telefon}`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Anrufen ${r.kunde_telefon}`}
              className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary active:scale-90 transition"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
          <FotoQuickAdd rapportId={r.id} fotos={r.fotos} onUploaded={onChanged} />
        </div>
      </div>

      {/* Zeile 3: Badges + Status-Pill */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="min-w-0">
          {r.kategorie && <KategorieBadges value={r.kategorie} size="xs" />}
        </div>
        {r.status !== "geplant" && (
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded shrink-0",
              r.status === "in_arbeit" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
              r.status === "erledigt" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {STATUS_LABEL[r.status]}
          </span>
        )}
      </div>
    </div>
  );
}

interface Props {
  days: Date[];
  rapports: Rapport[];
  onAdd: (date?: Date) => void;
  onAction: (r: Rapport) => void;
  highlightId?: string | null;
}

export function MobileWochenplan({ days, rapports, onAdd, onAction, highlightId }: Props) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-3">
      {days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        const dayRapports = rapports.filter((r) => r.geplantes_datum === key);
        const isToday = isSameDay(d, new Date());
        const totalH = dayRapports.reduce((s, r) => s + (r.arbeitszeit_stunden ?? 0), 0);
        const kap = kapazitaetFuer(d);
        const pct = kap > 0 ? Math.min(100, (totalH / kap) * 100) : 0;
        const color = auslastungsFarbe(totalH, kap);
        const barColor =
          color === "over"
            ? "bg-red-500"
            : color === "warn"
              ? "bg-amber-500"
              : "bg-emerald-500";
        const pillColor =
          color === "over"
            ? "text-red-500 bg-red-500/10"
            : color === "warn"
              ? "text-amber-500 bg-amber-500/10"
              : "text-emerald-500 bg-emerald-500/10";

        return (
          <section
            key={key}
            className={cn(
              "rounded-xl border bg-card",
              isToday ? "border-primary/40" : "border-border"
            )}
          >
            {/* Day-Header (nicht sticky, da overflow-hidden parent sticky bricht) */}
            <header
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2.5 border-b rounded-t-xl",
                isToday ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border"
              )}
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.12em] font-semibold",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {format(d, "EEE", { locale: de })}
                </span>
                <span
                  className={cn(
                    "text-base font-bold leading-none",
                    isToday && "text-primary"
                  )}
                >
                  {format(d, "d. MMM", { locale: de })}
                </span>
                {isToday && (
                  <span className="text-[9px] uppercase tracking-wider font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded">
                    Heute
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("text-xs font-mono font-semibold tabular-nums px-2 py-0.5 rounded", pillColor)}>
                  {totalH.toLocaleString("de-CH", { maximumFractionDigits: 1 })}/{kap}h
                </span>
                {/* Auftrag erstellen nur auf PC möglich (Beleg nötig) */}
              </div>
            </header>

            {/* Auslastungs-Balken */}
            <div className="h-1 bg-muted overflow-hidden">
              <div className={cn("h-full transition-all", barColor)} style={{ width: `${pct}%` }} />
            </div>


            {/* Aufträge */}
            <div className="p-2 space-y-2">
              {dayRapports.length === 0 ? (
                <div className="w-full text-center py-6 text-xs text-muted-foreground/60 italic">
                  Keine Aufträge
                </div>
              ) : (
                dayRapports.map((r) => {
                  const isOverdue = r.status === "geplant" && r.geplantes_datum < todayStr;
                  return (
                    <MobileCard
                      key={r.id}
                      r={r}
                      highlight={highlightId === r.id}
                      overdue={isOverdue}
                      onAction={onAction}
                    />
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
