import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, Trash2, UserCog, X } from "lucide-react";
import { useState } from "react";

type Mech = "Roman" | "Pascal" | null;

interface Props {
  count: number;
  days: Date[];
  onMoveToDate: (date: string) => void;
  onAssignMechanic: (m: Mech) => void;
  onDelete: () => void;
  onClear: () => void;
}

export function MultiSelectBar({
  count,
  days,
  onMoveToDate,
  onAssignMechanic,
  onDelete,
  onClear,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
      <div className="flex items-center gap-2 bg-card border border-border shadow-2xl rounded-full pl-4 pr-2 py-2">
        <span className="text-sm font-semibold mr-1 select-none">
          {count} {count === 1 ? "Auftrag" : "Aufträge"}
        </span>

        {/* Tag wählen — sichtbare Wochentage als Schnellwahl + Datum-Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" className="rounded-full h-8">
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" /> Verschieben
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" side="top" className="w-auto p-2">
            <div className="flex flex-col gap-1 mb-2">
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onMoveToDate(key)}
                    className="text-left px-3 py-1.5 rounded-md text-sm hover:bg-muted transition"
                  >
                    {format(d, "EEEE, d. MMM", { locale: de })}
                  </button>
                );
              })}
            </div>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="w-full justify-start text-xs">
                  <CalendarIcon className="h-3 w-3 mr-1.5" /> Anderes Datum…
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  onSelect={(d) => {
                    if (d) {
                      onMoveToDate(format(d, "yyyy-MM-dd"));
                      setPickerOpen(false);
                    }
                  }}
                  weekStartsOn={1}
                />
              </PopoverContent>
            </Popover>
          </PopoverContent>
        </Popover>

        {/* Mechaniker zuweisen */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" className="rounded-full h-8">
              <UserCog className="h-3.5 w-3.5 mr-1.5" /> Mechaniker
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" side="top" className="w-44 p-1">
            {[
              { key: "Roman" as const, label: "Roman", dot: "bg-blue-500" },
              { key: "Pascal" as const, label: "Pascal", dot: "bg-emerald-500" },
              { key: null as Mech, label: "Niemand", dot: "bg-muted-foreground" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => onAssignMechanic(o.key)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted text-left"
              >
                <span className={cn("h-2 w-2 rounded-full", o.dot)} />
                {o.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Löschen */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="rounded-full h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Löschen
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={onClear}
          className="rounded-full h-8 w-8 ml-1"
          aria-label="Auswahl aufheben"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
