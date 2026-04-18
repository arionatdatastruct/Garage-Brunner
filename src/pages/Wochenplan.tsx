import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, startOfWeek, addDays, isSameDay, parseISO, getISOWeek, getISOWeekYear } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { NeuerAuftragDialog } from "@/components/NeuerAuftragDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { kapazitaetFuer, auslastungsFarbe } from "@/lib/arbeitszeiten";
import { cn } from "@/lib/utils";

interface Rapport {
  id: string;
  rapport_nummer: string | null;
  auftragsnummer: string | null;
  geplantes_datum: string;
  status: string;
  mechaniker_zuweisung: string | null;
  arbeitszeit_stunden: number | null;
  fahrzeug: {
    kennzeichen: string;
    marke: string | null;
  } | null;
}

const MECH_COLOR: Record<string, string> = {
  Roman: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  Pascal: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

const STATUS_DOT: Record<string, string> = {
  geplant: "bg-muted-foreground",
  in_arbeit: "bg-amber-500",
  erledigt: "bg-emerald-500",
};

function RapportCard({ r }: { r: Rapport }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: r.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && navigate(`/auftrag/${r.id}`)}
      className="bg-card border border-border rounded-md p-3 mb-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition touch-none"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono font-semibold text-sm">
          {r.fahrzeug?.kennzeichen ?? "—"}
        </span>
        <span className={`h-2 w-2 rounded-full mt-1.5 ${STATUS_DOT[r.status] ?? "bg-muted-foreground"}`} />
      </div>
      <div className="text-xs text-muted-foreground truncate">
        {r.fahrzeug?.marke ?? "Kein Fahrzeug"}
      </div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-[10px] text-muted-foreground font-mono">
          {r.auftragsnummer ?? r.rapport_nummer}
        </span>
        <div className="flex items-center gap-1.5">
          {r.arbeitszeit_stunden != null && r.arbeitszeit_stunden > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {r.arbeitszeit_stunden.toLocaleString("de-CH", { maximumFractionDigits: 2 })}h
            </span>
          )}
          {r.mechaniker_zuweisung && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${MECH_COLOR[r.mechaniker_zuweisung] ?? ""}`}>
              {r.mechaniker_zuweisung}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  date,
  rapports,
  onAdd,
}: {
  date: Date;
  rapports: Rapport[];
  onAdd: () => void;
}) {
  const id = format(date, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({ id });
  const isToday = isSameDay(date, new Date());
  const totalH = rapports.reduce((sum, r) => sum + (r.arbeitszeit_stunden ?? 0), 0);
  const kap = kapazitaetFuer(date);
  const pct = kap > 0 ? Math.min(100, (totalH / kap) * 100) : 0;
  const color = auslastungsFarbe(totalH, kap);
  const barColor =
    color === "over" ? "bg-red-500" : color === "warn" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="min-w-[240px] md:min-w-0 flex-1 flex flex-col">
      <div className={`px-3 py-2 border-b border-border ${isToday ? "bg-primary/5" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              {format(date, "EEE", { locale: de })}
            </div>
            <div className={`text-lg font-semibold ${isToday ? "text-primary" : ""}`}>
              {format(date, "d. MMM", { locale: de })}
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onAdd} className="h-7 w-7">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">
              {rapports.length} {rapports.length === 1 ? "Auftrag" : "Aufträge"}
            </span>
            <span className="font-mono font-medium">
              {totalH.toLocaleString("de-CH", { maximumFractionDigits: 2 })}/{kap}h
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full transition-all", barColor)} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 min-h-[200px] transition-colors ${isOver ? "bg-primary/10" : ""}`}
      >
        {rapports.map((r) => (
          <RapportCard key={r.id} r={r} />
        ))}
        {rapports.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6">Leer</div>
        )}
      </div>
    </div>
  );
}

export default function Wochenplan() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | undefined>();

  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const load = useCallback(async () => {
    const from = format(weekStart, "yyyy-MM-dd");
    const to = format(addDays(weekStart, 5), "yyyy-MM-dd");
    const { data, error } = await (supabase as any)
      .from("arbeitsrapporte")
      .select("id, rapport_nummer, auftragsnummer, geplantes_datum, status, mechaniker_zuweisung, arbeitszeit_stunden, fahrzeug:fahrzeuge(kennzeichen, marke)")
      .in("status", ["geplant", "in_arbeit"])
      .gte("geplantes_datum", from)
      .lte("geplantes_datum", to)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Fehler beim Laden");
      return;
    }
    setRapports((data ?? []) as Rapport[]);
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const newDate = String(over.id);
    const r = rapports.find((x) => x.id === active.id);
    if (!r || r.geplantes_datum === newDate) return;

    setRapports((prev) => prev.map((x) => x.id === r.id ? { ...x, geplantes_datum: newDate } : x));
    const { error } = await (supabase as any)
      .from("arbeitsrapporte")
      .update({ geplantes_datum: newDate })
      .eq("id", r.id);
    if (error) {
      toast.error("Update fehlgeschlagen");
      load();
    }
  };

  const openDialog = (date?: Date) => {
    setDialogDate(date ? format(date, "yyyy-MM-dd") : undefined);
    setDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6">
      <header className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">Wochenplan</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-sm font-semibold">
              KW {getISOWeek(weekStart)} · {getISOWeekYear(weekStart)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {format(weekStart, "d. MMM", { locale: de })} – {format(addDays(weekStart, 5), "d. MMM yyyy", { locale: de })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setWeekStart((d) => addDays(d, -7))} title="Vorherige Woche">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Heute
          </Button>
          <Button size="icon" variant="outline" onClick={() => setWeekStart((d) => addDays(d, 7))} title="Nächste Woche">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-1" /> Neuer Auftrag
          </Button>
        </div>
      </header>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex md:grid md:grid-cols-6 gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayRapports = rapports.filter((r) => r.geplantes_datum === key);
            return (
              <div key={key} className="bg-muted/30 rounded-lg flex flex-col">
                <DayColumn date={d} rapports={dayRapports} onAdd={() => openDialog(d)} />
              </div>
            );
          })}
        </div>
      </DndContext>

      <NeuerAuftragDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={load}
        defaultDate={dialogDate}
      />
    </div>
  );
}
