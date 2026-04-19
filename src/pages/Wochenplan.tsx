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
import { Plus, ChevronLeft, ChevronRight, Trash2, ArrowRight } from "lucide-react";
import { NeuerAuftragDialog } from "@/components/NeuerAuftragDialog";
import { NeuerAuftragSheet } from "@/components/NeuerAuftragSheet";
import { MobileWochenplan } from "@/components/MobileWochenplan";
import { RapportActionSheet } from "@/components/RapportActionSheet";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle } from "lucide-react";

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

const MECH_DOT: Record<string, string> = {
  Roman: "bg-blue-500",
  Pascal: "bg-emerald-500",
};

const STATUS_BAR: Record<string, string> = {
  geplant: "bg-muted-foreground/30",
  in_arbeit: "bg-amber-500",
  erledigt: "bg-emerald-500",
};

function RapportCard({ r, onUpdate, onDelete, highlight, overdue }: { r: Rapport; onUpdate: (id: string, h: number | null) => void; onDelete: (r: Rapport) => void; highlight?: boolean; overdue?: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: r.id });
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
          className={cn(
            "group relative bg-card/60 hover:bg-card border border-border/60 hover:border-border",
            "rounded-lg pl-3 pr-2.5 py-2.5 mb-2 cursor-grab active:cursor-grabbing transition-all touch-none",
            "overflow-hidden",
            overdue && "border-destructive/60 bg-destructive/5 hover:border-destructive",
            highlight && "ring-2 ring-primary border-primary animate-pulse"
          )}
          data-rapport-id={r.id}
        >
          {/* Status-Strich links */}
          <div
            className={cn("absolute left-0 top-0 bottom-0 w-1", STATUS_BAR[r.status] ?? "bg-muted-foreground/30")}
            aria-hidden
          />

          {/* Kennzeichen + Mechaniker-Dot */}
          <div className="flex items-baseline justify-between gap-2 mb-1 pl-1">
            <span className="font-mono font-bold text-[15px] tracking-tight truncate">
              {r.kennzeichen ?? "—"}
            </span>
            {r.mechaniker_zuweisung && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <span className={cn("h-1.5 w-1.5 rounded-full", MECH_DOT[r.mechaniker_zuweisung] ?? "bg-muted-foreground")} />
                {r.mechaniker_zuweisung}
              </span>
            )}
          </div>

          {/* Fahrzeug + Kunde */}
          <div className="text-xs text-muted-foreground truncate pl-1">
            {r.marke ?? "Kein Fahrzeug"}
          </div>
          {(r.kunde_name || r.kundennummer) && (
            <div className="text-[11px] text-muted-foreground/80 truncate mt-0.5 pl-1">
              {r.kunde_name}
            </div>
          )}

          {/* Kategorie-Badges */}
          {r.kategorie && (
            <div className="mt-2 pl-1">
              <KategorieBadges value={r.kategorie} size="xs" />
            </div>
          )}

          {/* Footer: Auftragsnr · Stunden */}
          <div className="flex items-center justify-between mt-2 gap-2 pl-1">
            <span className="text-[10px] text-muted-foreground/70 font-mono truncate">
              {r.auftragsnummer ?? r.rapport_nummer}
            </span>
            <div onPointerDown={(e) => editing && e.stopPropagation()}>
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
                  className="w-14 h-6 text-xs font-mono px-1.5 rounded border border-primary bg-background focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={startEdit}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={cn(
                    "text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded transition",
                    r.arbeitszeit_stunden != null && r.arbeitszeit_stunden > 0
                      ? "text-foreground hover:bg-muted"
                      : "text-muted-foreground/60 hover:text-foreground hover:bg-muted border border-dashed border-border"
                  )}
                  title="Stunden bearbeiten"
                >
                  {r.arbeitszeit_stunden != null && r.arbeitszeit_stunden > 0
                    ? `${r.arbeitszeit_stunden.toLocaleString("de-CH", { maximumFractionDigits: 2 })}h`
                    : "+ h"}
                </button>
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
  highlightId,
}: {
  date: Date;
  rapports: Rapport[];
  onAdd: () => void;
  onUpdateStunden: (id: string, h: number | null) => void;
  onDelete: (r: Rapport) => void;
  highlightId?: string | null;
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
      <div className={cn(
        "px-3 py-2.5 border-b border-border/60",
        isToday && "bg-primary/5",
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className={cn(
              "text-[10px] uppercase tracking-[0.12em] font-medium",
              isToday ? "text-primary" : "text-muted-foreground",
            )}>
              {format(date, "EEEE", { locale: de })}
            </div>
            <div className={cn(
              "text-xl font-bold tracking-tight leading-none mt-1",
              isToday && "text-primary",
            )}>
              {format(date, "d. MMM", { locale: de })}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onAdd}
            className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100"
            title="Auftrag hinzufügen"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {rapports.length === 0 ? "—" : `${rapports.length} ${rapports.length === 1 ? "Auftrag" : "Aufträge"}`}
          </span>
          <span className={cn(
            "text-[11px] font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded",
            color === "over" && "text-red-500 bg-red-500/10",
            color === "warn" && "text-amber-500 bg-amber-500/10",
            color === "ok" && "text-emerald-500 bg-emerald-500/10",
          )}>
            {totalH.toLocaleString("de-CH", { maximumFractionDigits: 1 })}/{kap}h
          </span>
        </div>
        <div className="h-0.5 mt-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full transition-all", barColor)} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 min-h-[200px] transition-colors",
          isOver && "bg-primary/10",
        )}
      >
        {rapports.map((r) => {
          const isOverdue = r.status === "geplant" && r.geplantes_datum < format(new Date(), "yyyy-MM-dd");
          return (
            <RapportCard key={r.id} r={r} onUpdate={onUpdateStunden} onDelete={onDelete} highlight={highlightId === r.id} overdue={isOverdue} />
          );
        })}
        {rapports.length === 0 && (
          <div className="text-[11px] text-muted-foreground/50 text-center py-8 italic">
            Keine Aufträge
          </div>
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
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [otherWeeksCount, setOtherWeeksCount] = useState(0);
  const [nextOtherDate, setNextOtherDate] = useState<string | null>(null);
  const [nextOthers, setNextOthers] = useState<Array<{ id: string; geplantes_datum: string; kennzeichen: string | null; rapport_nummer: string | null }>>([]);
  const [overdue, setOverdue] = useState<Array<{ id: string; geplantes_datum: string; kennzeichen: string | null; rapport_nummer: string | null }>>([]);
  const [actionRapport, setActionRapport] = useState<Rapport | null>(null);
  const [mechFilter, setMechFilter] = useState<"alle" | "Roman" | "Pascal">(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem("wp.mechFilter") : null;
    return v === "Roman" || v === "Pascal" ? v : "alle";
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    try { localStorage.setItem("wp.mechFilter", mechFilter); } catch {}
  }, [mechFilter]);

  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const visibleRapports = mechFilter === "alle"
    ? rapports
    : rapports.filter((r) => r.mechaniker_zuweisung === mechFilter);

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

  // Aufträge in anderen (nicht angezeigten) Wochen + überfällige geplante Aufträge
  useEffect(() => {
    const from = format(weekStart, "yyyy-MM-dd");
    const to = format(addDays(weekStart, 4), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    (async () => {
      const { data } = await (supabase as any)
        .from("arbeitsrapporte")
        .select("id, geplantes_datum, kennzeichen, rapport_nummer")
        .in("status", ["geplant", "in_arbeit"])
        .gte("geplantes_datum", today)
        .or(`geplantes_datum.lt.${from},geplantes_datum.gt.${to}`)
        .order("geplantes_datum", { ascending: true });
      const list = (data ?? []) as Array<{ id: string; geplantes_datum: string; kennzeichen: string | null; rapport_nummer: string | null }>;
      setOtherWeeksCount(list.length);
      setNextOtherDate(list[0]?.geplantes_datum ?? null);
      setNextOthers(list.slice(0, 3));

      // Überfällige: Status 'geplant' und Datum < heute
      const { data: od } = await (supabase as any)
        .from("arbeitsrapporte")
        .select("id, geplantes_datum, kennzeichen, rapport_nummer")
        .eq("status", "geplant")
        .lt("geplantes_datum", today)
        .order("geplantes_datum", { ascending: true });
      setOverdue((od ?? []) as Array<{ id: string; geplantes_datum: string; kennzeichen: string | null; rapport_nummer: string | null }>);
    })();
  }, [weekStart, rapports]);

  // Highlight-Animation nach 2.5s entfernen
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightId]);

  const handleCreated = async (info?: { id: string; geplantes_datum: string }) => {
    if (info) {
      const targetWeek = startOfWeek(parseISO(info.geplantes_datum), { weekStartsOn: 1 });
      setWeekStart(targetWeek);
      setHighlightId(info.id);
      // Scroll zur Karte (nach Render)
      setTimeout(() => {
        const el = document.querySelector(`[data-rapport-id="${info.id}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }, 250);
    }
    await load();
  };

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

  const jumpToRapport = (datum: string, id: string) => {
    setWeekStart(startOfWeek(parseISO(datum), { weekStartsOn: 1 }));
    setHighlightId(id);
    setTimeout(() => {
      const el = document.querySelector(`[data-rapport-id="${id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 250);
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

      {/* Warn-Banner: überfällige geplante Aufträge */}
      {overdue.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full mb-3 flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 hover:bg-destructive/15 transition px-4 py-2.5 text-left"
            >
              <span className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span>
                  <span className="font-semibold text-destructive">{overdue.length}</span>{" "}
                  überfällige{overdue.length === 1 ? "r Auftrag" : " Aufträge"}
                  <span className="text-muted-foreground ml-2">
                    · ältester: {format(parseISO(overdue[0].geplantes_datum), "EEE, d. MMM", { locale: de })}
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive shrink-0">
                Anzeigen <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="p-0 w-72">
            <div className="px-3 py-2 border-b border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Überfällige Aufträge
              </div>
            </div>
            <ul className="py-1 max-h-64 overflow-y-auto">
              {overdue.slice(0, 10).map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => jumpToRapport(o.geplantes_datum, o.id)}
                    className="w-full px-3 py-1.5 flex items-center justify-between gap-3 hover:bg-muted text-left"
                  >
                    <span className="font-mono font-semibold text-sm">{o.kennzeichen ?? "—"}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                        KW {getISOWeek(parseISO(o.geplantes_datum))}
                      </span>
                      <span className="text-xs text-destructive tabular-nums">
                        {format(parseISO(o.geplantes_datum), "EEE, d. MMM", { locale: de })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}

      {/* Hinweis-Banner: Aufträge in anderen Wochen */}
      {otherWeeksCount > 0 && nextOtherDate && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition px-4 py-2.5 text-left"
            >
              <span className="text-sm">
                <span className="font-semibold text-primary">{otherWeeksCount}</span>{" "}
                {otherWeeksCount === 1 ? "Auftrag" : "Aufträge"} in anderen Wochen
                <span className="text-muted-foreground ml-2">
                  · nächster: {format(parseISO(nextOtherDate), "EEE, d. MMM", { locale: de })}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary shrink-0">
                Anzeigen <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="p-0 w-72">
            <div className="px-3 py-2 border-b border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Nächste {nextOthers.length} {nextOthers.length === 1 ? "Auftrag" : "Aufträge"}
              </div>
            </div>
            <ul className="py-1">
              {nextOthers.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => jumpToRapport(o.geplantes_datum, o.id)}
                    className="w-full px-3 py-1.5 flex items-center justify-between gap-3 hover:bg-muted text-left"
                  >
                    <span className="font-mono font-semibold text-sm">{o.kennzeichen ?? "—"}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                        KW {getISOWeek(parseISO(o.geplantes_datum))}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {format(parseISO(o.geplantes_datum), "EEE, d. MMM", { locale: de })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}

      {/* Mechaniker-Filter */}
      <div className="mb-3 flex items-center gap-2 overflow-x-auto -mx-1 px-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
          Mechaniker
        </span>
        {([
          { key: "alle", label: "Alle", dot: null as string | null },
          { key: "Roman", label: "Roman", dot: "bg-blue-500" },
          { key: "Pascal", label: "Pascal", dot: "bg-emerald-500" },
        ] as const).map((opt) => {
          const active = mechFilter === opt.key;
          const count = opt.key === "alle"
            ? rapports.length
            : rapports.filter((r) => r.mechaniker_zuweisung === opt.key).length;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMechFilter(opt.key as typeof mechFilter)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted"
              )}
              aria-pressed={active}
            >
              {opt.dot && <span className={cn("h-2 w-2 rounded-full", opt.dot)} />}
              {opt.label}
              <span className={cn(
                "tabular-nums text-[10px] font-mono px-1.5 py-0.5 rounded",
                active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: Vertikale Tagesliste (Agenda) — kein D&D */}
      <div className="md:hidden">
        <MobileWochenplan
          days={days}
          rapports={visibleRapports}
          onAdd={(d) => openDialog(d)}
          onAction={(r) => setActionRapport(r)}
          highlightId={highlightId}
        />
      </div>

      {/* Desktop: Grid mit Drag&Drop */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="hidden md:grid md:grid-cols-5 gap-3">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayRapports = visibleRapports.filter((r) => r.geplantes_datum === key);
            return (
              <div key={key} className="bg-muted/30 rounded-lg flex flex-col">
                <DayColumn date={d} rapports={dayRapports} onAdd={() => openDialog(d)} onUpdateStunden={updateStunden} onDelete={setToDelete} highlightId={highlightId} />
              </div>
            );
          })}
        </div>
      </DndContext>

      {/* Mobile: Action-Sheet für Karten-Aktionen */}
      <RapportActionSheet
        rapport={actionRapport}
        onOpenChange={(o) => !o && setActionRapport(null)}
        onChanged={() => { load(); setActionRapport(null); }}
        onDelete={(r) => { setToDelete(r); setActionRapport(null); }}
      />

      {/* Neuer-Auftrag — Sheet auf Mobile, Dialog auf Desktop */}
      {isMobile ? (
        <NeuerAuftragSheet
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={handleCreated}
          defaultDate={dialogDate}
        />
      ) : (
        <NeuerAuftragDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={handleCreated}
          defaultDate={dialogDate}
        />
      )}

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
