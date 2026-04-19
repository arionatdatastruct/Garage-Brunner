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
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { NeuerAuftragDialog } from "@/components/NeuerAuftragDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { kapazitaetFuer, auslastungsFarbe } from "@/lib/arbeitszeiten";
import { cn } from "@/lib/utils";
import { KategorieBadges } from "@/components/KategorieBadges";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const MECH_COLOR: Record<string, string> = {
  Roman: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  Pascal: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

const STATUS_DOT: Record<string, string> = {
  geplant: "bg-muted-foreground",
  in_arbeit: "bg-amber-500",
  erledigt: "bg-emerald-500",
};

function RapportCard({ r, onUpdate, onDelete }: { r: Rapport; onUpdate: (id: string, h: number | null) => void; onDelete: (r: Rapport) => void }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: r.id,
  });
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState<string>(
    r.arbeitszeit_stunden != null ? String(r.arbeitszeit_stunden) : ""
  );

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVal(r.arbeitszeit_stunden != null ? String(r.arbeitszeit_stunden) : "");
    setEditing(true);
  };

  const commit = async () => {
    const num = val === "" ? null : Number(val);
    if (num !== null && (Number.isNaN(num) || num < 0)) {
      setEditing(false);
      return;
    }
    setEditing(false);
    if (num === r.arbeitszeit_stunden) return;
    const { error } = await (supabase as any)
      .from("arbeitsrapporte")
      .update({ arbeitszeit_stunden: num })
      .eq("id", r.id);
    if (error) {
      toast.error("Update fehlgeschlagen");
      return;
    }
    onUpdate(r.id, num);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={() => !isDragging && !editing && navigate(`/auftrag/${r.id}`)}
          className="bg-card border border-border rounded-md p-3 mb-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition touch-none"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-mono font-semibold text-sm">
              {r.kennzeichen ?? "—"}
            </span>
            <span className={`h-2 w-2 rounded-full mt-1.5 ${STATUS_DOT[r.status] ?? "bg-muted-foreground"}`} />
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {r.marke ?? "Kein Fahrzeug"}
          </div>
          {(r.kunde_name || r.kundennummer) && (
            <div className="text-[10px] text-muted-foreground truncate mt-0.5">
              {r.kundennummer && <span className="font-mono mr-1">#{r.kundennummer}</span>}
              {r.kunde_name}
            </div>
          )}
          {r.kategorie && (
            <div className="mt-1.5">
              <KategorieBadges value={r.kategorie} size="xs" />
            </div>
          )}
          <div className="flex items-center justify-between mt-2 gap-2">
            <span className="text-[10px] text-muted-foreground font-mono">
              {r.auftragsnummer ?? r.rapport_nummer}
            </span>
            <div className="flex items-center gap-1.5" onPointerDown={(e) => editing && e.stopPropagation()}>
              {editing ? (
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  autoFocus
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-12 h-5 text-[10px] font-mono px-1 rounded border border-primary bg-background focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={startEdit}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded transition"
                  title="Stunden bearbeiten"
                >
                  {r.arbeitszeit_stunden != null && r.arbeitszeit_stunden > 0
                    ? `${r.arbeitszeit_stunden.toLocaleString("de-CH", { maximumFractionDigits: 2 })}h`
                    : "+ h"}
                </button>
              )}
              {r.mechaniker_zuweisung && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${MECH_COLOR[r.mechaniker_zuweisung] ?? ""}`}>
                  {r.mechaniker_zuweisung}
                </span>
              )}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={() => onDelete(r)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" /> Auftrag löschen
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function DayColumn({
  date,
  rapports,
  onAdd,
  onUpdateStunden,
  onDelete,
}: {
  date: Date;
  rapports: Rapport[];
  onAdd: () => void;
  onUpdateStunden: (id: string, h: number | null) => void;
  onDelete: (r: Rapport) => void;
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
    <div className="w-full flex-1 flex flex-col">
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
          <RapportCard key={r.id} r={r} onUpdate={onUpdateStunden} onDelete={onDelete} />
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

  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const load = useCallback(async () => {
    const from = format(weekStart, "yyyy-MM-dd");
    const to = format(addDays(weekStart, 4), "yyyy-MM-dd");
    const { data, error } = await (supabase as any)
      .from("arbeitsrapporte")
      .select("id, rapport_nummer, auftragsnummer, geplantes_datum, status, mechaniker_zuweisung, arbeitszeit_stunden, kategorie, kennzeichen, marke, kundennummer, kunde_name")
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

  // Mobile FAB öffnet denselben Dialog
  useEffect(() => {
    const handler = () => openDialog();
    window.addEventListener("open-neuer-auftrag", handler);
    return () => window.removeEventListener("open-neuer-auftrag", handler);
  }, []);

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

  const updateStunden = (id: string, h: number | null) => {
    setRapports((prev) => prev.map((r) => (r.id === id ? { ...r, arbeitszeit_stunden: h } : r)));
  };

  const [toDelete, setToDelete] = useState<Rapport | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      for (const bucket of ["belege", "fotos"] as const) {
        const { data: files } = await supabase.storage.from(bucket).list(toDelete.id);
        if (files && files.length > 0) {
          await supabase.storage
            .from(bucket)
            .remove(files.map((f) => `${toDelete.id}/${f.name}`));
        }
      }
      const { error } = await (supabase as any)
        .from("arbeitsrapporte")
        .delete()
        .eq("id", toDelete.id);
      if (error) throw error;
      setRapports((prev) => prev.filter((r) => r.id !== toDelete.id));
      toast.success("Auftrag gelöscht");
      setToDelete(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Fehler beim Löschen");
    } finally {
      setDeleting(false);
    }
  };

  // Wochen-Gesamtauslastung
  const weekTotalH = days.reduce((sum, d) => {
    const key = format(d, "yyyy-MM-dd");
    return sum + rapports
      .filter((r) => r.geplantes_datum === key)
      .reduce((s, r) => s + (r.arbeitszeit_stunden ?? 0), 0);
  }, 0);
  const weekKap = days.reduce((sum, d) => sum + kapazitaetFuer(d), 0);
  const weekPct = weekKap > 0 ? Math.round((weekTotalH / weekKap) * 100) : 0;
  const weekColor = auslastungsFarbe(weekTotalH, weekKap);
  const weekBar =
    weekColor === "over" ? "bg-red-500" : weekColor === "warn" ? "bg-amber-500" : "bg-emerald-500";
  const weekText =
    weekColor === "over" ? "text-red-500" : weekColor === "warn" ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="p-3 md:p-6">
      <header className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="hidden md:block text-2xl font-bold">Wochenplan</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-sm font-semibold">
              KW {getISOWeek(weekStart)} · {getISOWeekYear(weekStart)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {format(weekStart, "d. MMM", { locale: de })} – {format(addDays(weekStart, 4), "d. MMM yyyy", { locale: de })}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button size="icon" variant="outline" onClick={() => setWeekStart((d) => addDays(d, -7))} title="Vorherige Woche" aria-label="Vorherige Woche">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Heute
          </Button>
          <Button size="icon" variant="outline" onClick={() => setWeekStart((d) => addDays(d, 7))} title="Nächste Woche" aria-label="Nächste Woche">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => openDialog()} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4 mr-1" /> Neuer Auftrag
          </Button>
        </div>
      </header>

      <div className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Wochen-Auslastung</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-bold font-mono">
                {weekTotalH.toLocaleString("de-CH", { maximumFractionDigits: 2 })}
                <span className="text-muted-foreground text-xl">/{weekKap}h</span>
              </span>
              <span className={cn("text-2xl font-bold", weekText)}>{weekPct}%</span>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{rapports.length} {rapports.length === 1 ? "Auftrag" : "Aufträge"} geplant</div>
            <div>Mo–Do je 9 h · Fr 8 h</div>
          </div>
        </div>
        <div className="h-2 mt-3 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full transition-all", weekBar)}
            style={{ width: `${Math.min(100, weekPct)}%` }}
          />
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {/* Mobile: Snap-Karussell, eine Spalte pro Screen */}
        <div
          className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 -mx-3 px-3 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollPaddingInline: "0.75rem" }}
        >
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayRapports = rapports.filter((r) => r.geplantes_datum === key);
            return (
              <div
                key={key}
                className="snap-center shrink-0 w-[calc(100vw-1.5rem)] bg-muted/30 rounded-lg flex flex-col"
              >
                <DayColumn date={d} rapports={dayRapports} onAdd={() => openDialog(d)} onUpdateStunden={updateStunden} onDelete={setToDelete} />
              </div>
            );
          })}
        </div>

        {/* Mobile: Pagination Dots */}
        <div className="md:hidden flex justify-center gap-1.5 -mt-2 mb-2">
          {days.map((d) => {
            const isToday = isSameDay(d, new Date());
            return (
              <span
                key={format(d, "yyyy-MM-dd")}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isToday ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            );
          })}
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid md:grid-cols-5 gap-3">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayRapports = rapports.filter((r) => r.geplantes_datum === key);
            return (
              <div key={key} className="bg-muted/30 rounded-lg flex flex-col">
                <DayColumn date={d} rapports={dayRapports} onAdd={() => openDialog(d)} onUpdateStunden={updateStunden} onDelete={setToDelete} />
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

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auftrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.rapport_nummer ?? "Auftrag"} wird unwiderruflich gelöscht — inkl. PDF und Fotos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
