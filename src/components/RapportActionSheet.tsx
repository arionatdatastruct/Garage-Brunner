import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format, addDays, parseISO, getDay, isBefore, startOfDay, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { naechsterWerktag, istArbeitstag } from "@/lib/arbeitszeiten";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Trash2,
} from "lucide-react";

type Status = "geplant" | "in_arbeit" | "erledigt";

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
}

interface Props {
  rapport: Rapport | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onDelete: (r: Rapport) => void;
}

const STATUS_BTN: Record<Status, { label: string; icon: typeof Play; cls: string }> = {
  geplant: { label: "Geplant", icon: Pause, cls: "bg-muted text-foreground" },
  in_arbeit: { label: "In Arbeit", icon: Play, cls: "bg-amber-500 text-white" },
  erledigt: { label: "Erledigt", icon: CheckCircle2, cls: "bg-emerald-500 text-white" },
};

const STUNDEN_QUICK = [0.25, 0.5, 1, 2, 4, 8];

export function RapportActionSheet({ rapport, onOpenChange, onChanged, onDelete }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [stunden, setStunden] = useState<string>("");

  useEffect(() => {
    if (rapport) {
      setStunden(rapport.arbeitszeit_stunden != null ? String(rapport.arbeitszeit_stunden) : "");
    }
  }, [rapport]);

  if (!rapport) return null;

  const close = () => onOpenChange(false);

  const updateField = async (patch: Record<string, unknown>, label: string) => {
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from("arbeitsrapporte")
        .update(patch)
        .eq("id", rapport.id);
      if (error) throw error;
      toast.success(label);
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (s: Status) => {
    await updateField({ status: s }, `Status: ${STATUS_BTN[s].label}`);
    close();
  };

  const saveStunden = async (val?: number) => {
    const num = val !== undefined ? val : stunden === "" ? null : Number(stunden);
    if (num !== null && (Number.isNaN(num) || num < 0)) return;
    setStunden(num != null ? String(num) : "");
    await updateField({ arbeitszeit_stunden: num }, `${num ?? 0}h gespeichert`);
  };

  const verschieben = async (datum: string) => {
    if (!istArbeitstag(datum)) {
      toast.error("Nur Mo–Fr");
      return;
    }
    await updateField({ geplantes_datum: datum }, `Verschoben auf ${format(parseISO(datum), "EEE, d. MMM", { locale: de })}`);
    close();
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrowDate = naechsterWerktag(addDays(new Date(), 1));
  const tomorrow = format(tomorrowDate, "yyyy-MM-dd");
  const dayAfterDate = naechsterWerktag(addDays(tomorrowDate, 1));
  const dayAfter = format(dayAfterDate, "yyyy-MM-dd");

  return (
    <Drawer open={!!rapport} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-6 max-h-[92vh]">
        <DrawerHeader className="px-0 pt-2 pb-3">
          <DrawerTitle className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-xl font-bold">{rapport.kennzeichen ?? "—"}</span>
            <span className="text-xs font-normal text-muted-foreground font-mono">
              {rapport.auftragsnummer ?? rapport.rapport_nummer}
            </span>
          </DrawerTitle>
          {rapport.marke && (
            <p className="text-xs text-muted-foreground text-left">{rapport.marke}</p>
          )}
        </DrawerHeader>

        <div className="space-y-5 overflow-y-auto">
          {/* Verschieben — als wichtigste Aktion ganz oben (Drag&Drop-Ersatz) */}
          <section>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /> Auf anderen Tag verschieben
            </div>
            {/* Aktuelle Woche – Mo–Fr als Pills (wie eine D&D-Spaltenwahl) */}
            {(() => {
              const currentWeekStart = startOfWeek(parseISO(rapport.geplantes_datum), { weekStartsOn: 1 });
              const today = startOfDay(new Date());
              return (
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i)).map((d) => {
                    const iso = format(d, "yyyy-MM-dd");
                    const isCurrent = rapport.geplantes_datum === iso;
                    const isPast = isBefore(d, today);
                    const isToday = isSameToday(d);
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => verschieben(iso)}
                        disabled={busy || isCurrent || isPast}
                        className={cn(
                          "h-16 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition active:scale-95",
                          isCurrent
                            ? "border-primary bg-primary/15 text-primary cursor-default"
                            : isPast
                              ? "border-border bg-muted/30 text-muted-foreground/40"
                              : isToday
                                ? "border-primary/60 bg-primary/5 hover:bg-primary/15"
                                : "border-border bg-card hover:bg-muted"
                        )}
                      >
                        <span className="text-[10px] uppercase tracking-wider opacity-70">
                          {format(d, "EEE", { locale: de })}
                        </span>
                        <span className="text-base font-bold tabular-nums leading-none">
                          {format(d, "d")}
                        </span>
                        <span className="text-[9px] opacity-60 font-mono">
                          {format(d, "MMM", { locale: de })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            {/* Schnellsprünge */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => verschieben(format(naechsterWerktag(addDays(parseISO(rapport.geplantes_datum), 7)), "yyyy-MM-dd"))}
                disabled={busy}
                className="h-10 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                <ArrowRight className="h-3 w-3" /> Nächste Woche
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-10 justify-center font-normal text-xs">
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    Datum wählen…
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={parseISO(rapport.geplantes_datum)}
                    onSelect={(d) => d && verschieben(format(d, "yyyy-MM-dd"))}
                    disabled={(date) => {
                      const day = getDay(date);
                      if (day === 0 || day === 6) return true;
                      return isBefore(date, startOfDay(new Date()));
                    }}
                    weekStartsOn={1}
                    locale={de}
                    initialFocus
                    className={cn(
                      "p-3 pointer-events-auto",
                      "[&_thead_tr>th:nth-child(6)]:hidden [&_thead_tr>th:nth-child(7)]:hidden",
                      "[&_tbody_tr>td:nth-child(6)]:hidden [&_tbody_tr>td:nth-child(7)]:hidden"
                    )}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </section>

          {/* Status */}
          <section>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Status
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["geplant", "in_arbeit", "erledigt"] as Status[]).map((s) => {
                const cfg = STATUS_BTN[s];
                const Icon = cfg.icon;
                const active = rapport.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    disabled={busy || active}
                    className={cn(
                      "h-14 rounded-lg border border-border flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition active:scale-95",
                      active ? cfg.cls : "bg-card hover:bg-muted",
                      busy && "opacity-50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Stunden */}
          <section>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Arbeitszeit
            </div>
            <div className="flex gap-2 mb-2">
              <Input
                type="number"
                step="0.25"
                min="0"
                inputMode="decimal"
                value={stunden}
                onChange={(e) => setStunden(e.target.value)}
                onBlur={() => saveStunden()}
                placeholder="0.00"
                className="h-12 text-base font-mono tabular-nums text-right pr-3"
              />
              <div className="flex items-center px-3 rounded-md bg-muted text-sm font-medium text-muted-foreground">
                h
              </div>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {STUNDEN_QUICK.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => saveStunden(h)}
                  disabled={busy}
                  className="h-9 rounded-md border border-border bg-card hover:bg-muted text-xs font-mono font-semibold active:scale-95 transition"
                >
                  {h}
                </button>
              ))}
            </div>
          </section>

          {/* Aktionen */}
          <section className="pt-2 border-t border-border space-y-2">
            <Button
              className="w-full h-12"
              onClick={() => {
                close();
                navigate(`/auftrag/${rapport.id}`);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Auftrag öffnen
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 text-destructive hover:text-destructive border-destructive/40"
              onClick={() => {
                onDelete(rapport);
                close();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </section>
        </div>

        {busy && (
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center pointer-events-none">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
