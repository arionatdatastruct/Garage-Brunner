import { useEffect, useState } from "react";
import { format, startOfWeek, addDays, parseISO, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { kapazitaetFuer, auslastungsFarbe } from "@/lib/arbeitszeiten";
import { cn } from "@/lib/utils";

interface Props {
  /** ISO yyyy-MM-dd – aktuell im Dialog gewählter Tag */
  selectedDate: string;
  /** zusätzliche Stunden (Vorschau für neuen Auftrag) */
  zusatzStunden?: number;
}

interface Row {
  geplantes_datum: string;
  arbeitszeit_stunden: number | null;
}

const BAR_COLOR: Record<"ok" | "warn" | "over", string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  over: "bg-red-500",
};

export function WochenAuslastung({ selectedDate, zusatzStunden = 0 }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const sel = parseISO(selectedDate);
  const weekStart = startOfWeek(sel, { weekStartsOn: 1 });
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const from = format(weekStart, "yyyy-MM-dd");
    const to = format(addDays(weekStart, 4), "yyyy-MM-dd");
    (async () => {
      const { data } = await (supabase as any)
        .from("arbeitsrapporte")
        .select("geplantes_datum, arbeitszeit_stunden")
        .in("status", ["geplant", "in_arbeit"])
        .gte("geplantes_datum", from)
        .lte("geplantes_datum", to);
      setRows((data ?? []) as Row[]);
    })();
  }, [selectedDate]);

  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <div className="text-xs text-muted-foreground mb-1.5 px-1">
        Auslastung KW · {format(weekStart, "d. MMM", { locale: de })}–{format(addDays(weekStart, 4), "d. MMM", { locale: de })}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const isSelected = isSameDay(d, sel);
          const verplantBase = rows
            .filter((r) => r.geplantes_datum === key)
            .reduce((s, r) => s + (r.arbeitszeit_stunden ?? 0), 0);
          const verplant = verplantBase + (isSelected ? zusatzStunden : 0);
          const kap = kapazitaetFuer(d);
          const pct = kap > 0 ? Math.min(100, (verplant / kap) * 100) : 0;
          const color = auslastungsFarbe(verplant, kap);

          return (
            <div
              key={key}
              className={cn(
                "rounded-md p-1.5 text-center transition border",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-transparent bg-background"
              )}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {format(d, "EEE", { locale: de })}
              </div>
              <div className="text-[11px] font-mono mt-0.5">
                {verplant.toLocaleString("de-CH", { maximumFractionDigits: 2 })}/{kap}
              </div>
              <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all", BAR_COLOR[color])}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
