import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2, Wrench, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  usePositionenStore,
  persistUpdate,
  type Position,
  type PositionTyp,
} from "@/stores/positionenStore";

export type { Position, PositionTyp };

interface Props {
  rapportId: string;
}

const EINHEITEN_MATERIAL = ["Stk", "Liter", "m", "Set", "kg", "Pauschal"];
const DEFAULT_EINHEIT = "Stk";

export function PositionenEditor({ rapportId }: Props) {
  const subscribe = usePositionenStore((s) => s.subscribe);
  const positionen = usePositionenStore((s) => s.byRapport[rapportId]?.positionen ?? []);
  const loading = usePositionenStore((s) => s.byRapport[rapportId]?.loading ?? true);
  const upsertLocal = usePositionenStore((s) => s.upsertLocal);
  const removeLocal = usePositionenStore((s) => s.removeLocal);

  useEffect(() => subscribe(rapportId), [rapportId, subscribe]);

  const arbeit = positionen.filter((p) => p.typ === "arbeit");
  const material = positionen.filter((p) => p.typ === "material");

  const addPos = async (typ: PositionTyp) => {
    const sort_order =
      Math.max(0, ...positionen.filter((p) => p.typ === typ).map((p) => p.sort_order)) + 1;
    const payload =
      typ === "arbeit"
        ? {
            rapport_id: rapportId,
            typ,
            beschreibung: "",
            erledigt: false,
            menge: 0,
            einheit: "Check",
            sort_order,
          }
        : {
            rapport_id: rapportId,
            typ,
            beschreibung: "",
            menge: 1,
            einheit: DEFAULT_EINHEIT,
            sort_order,
          };
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        insert: (p: object) => {
          select: () => { single: () => Promise<{ data: Position | null; error: unknown }> };
        };
      };
    })
      .from("rapport_positionen")
      .insert(payload)
      .select()
      .single();
    if (error || !data) {
      toast.error("Position konnte nicht angelegt werden");
      return;
    }
    // Optimistic — realtime will reconcile
    upsertLocal(rapportId, data);
  };

  const updatePos = async (id: string, patch: Partial<Position>) => {
    const current = positionen.find((p) => p.id === id);
    if (current) upsertLocal(rapportId, { ...current, ...patch });

    // erledigt is the sole source of truth — never derive from menge
    const error = await persistUpdate(id, patch);
    if (error) {
      toast.error("Speichern fehlgeschlagen");
    }
  };

  const removePos = async (id: string) => {
    removeLocal(rapportId, id);
    const { error } = await (supabase as unknown as {
      from: (t: string) => {
        delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
      };
    })
      .from("rapport_positionen")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Positionen laden…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ArbeitSektion
        positionen={arbeit}
        onAdd={() => addPos("arbeit")}
        onUpdate={updatePos}
        onRemove={removePos}
      />
      <MaterialSektion
        positionen={material}
        onAdd={() => addPos("material")}
        onUpdate={updatePos}
        onRemove={removePos}
      />
    </div>
  );
}

function ArbeitSektion({
  positionen,
  onAdd,
  onUpdate,
  onRemove,
}: {
  positionen: Position[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Position>) => void;
  onRemove: (id: string) => void;
}) {
  const COLLAPSE_LIMIT = 5;
  const [expanded, setExpanded] = useState(false);
  const offen = positionen.filter((p) => !p.erledigt).length;
  const needsCollapse = positionen.length > COLLAPSE_LIMIT;
  const visible = needsCollapse && !expanded ? positionen.slice(0, COLLAPSE_LIMIT) : positionen;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Wrench className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold uppercase tracking-wider">Arbeit</h4>
        <span className="text-xs text-muted-foreground">
          ({positionen.length}){offen > 0 && <> · {offen} offen</>}
        </span>
      </div>
      <div className="rounded-xl border border-border bg-background/30 divide-y divide-border overflow-hidden">
        {positionen.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-3 py-4">Noch keine Aufgabe.</p>
        )}
        {visible.map((p) => {
          const checked = !!p.erledigt;
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-start gap-3 p-3 transition-colors min-h-[64px]",
                checked
                  ? "bg-emerald-500/10"
                  : "bg-transparent",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  onUpdate(p.id, { erledigt: !checked, menge: !checked ? 1 : 0, einheit: "Check" })
                }
                aria-label="Aufgabe erledigt"
                aria-pressed={checked}
                className={cn(
                  "h-11 w-11 shrink-0 rounded-lg border-2 flex items-center justify-center transition active:scale-95",
                  checked
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-background border-border hover:border-primary/50",
                )}
              >
                <Checkbox
                  checked={checked}
                  className="h-5 w-5 pointer-events-none border-0 bg-transparent data-[state=checked]:bg-transparent data-[state=checked]:text-white"
                  tabIndex={-1}
                />
              </button>
              <Textarea
                defaultValue={p.beschreibung ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (p.beschreibung ?? "")) onUpdate(p.id, { beschreibung: v });
                }}
                placeholder="Aufgabe"
                rows={1}
                className={cn(
                  "min-h-11 max-h-48 overflow-y-auto py-2.5 bg-transparent flex-1 min-w-0 border-0 focus-visible:ring-0 px-2 resize-y leading-snug break-words whitespace-pre-wrap text-base",
                  checked && "line-through text-muted-foreground",
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => onRemove(p.id)}
                aria-label="Aufgabe löschen"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          );
        })}
      </div>
      {needsCollapse && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setExpanded((x) => !x)}
          className="w-full h-11 text-sm text-muted-foreground"
        >
          {expanded ? (
            <><ChevronUp className="h-4 w-4 mr-1.5" /> Weniger anzeigen</>
          ) : (
            <><ChevronDown className="h-4 w-4 mr-1.5" /> Alle {positionen.length} Aufgaben anzeigen ({positionen.length - COLLAPSE_LIMIT} mehr)</>
          )}
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        className={cn("w-full h-12 border-dashed text-base")}
      >
        <Plus className="h-5 w-5 mr-1.5" />
        Aufgabe hinzufügen
      </Button>
    </div>
  );
}

function MaterialSektion({
  positionen,
  onAdd,
  onUpdate,
  onRemove,
}: {
  positionen: Position[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Position>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold uppercase tracking-wider">Material</h4>
        <span className="text-xs text-muted-foreground">({positionen.length})</span>
      </div>
      <div className="space-y-2">
        {positionen.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1">Noch keine Position.</p>
        )}
        {positionen.map((p) => {
          const einheit = p.einheit && EINHEITEN_MATERIAL.includes(p.einheit)
            ? p.einheit
            : DEFAULT_EINHEIT;
          return (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-background/50 p-2.5 space-y-2"
            >
              <Input
                defaultValue={p.beschreibung ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (p.beschreibung ?? "")) onUpdate(p.id, { beschreibung: v });
                }}
                placeholder="Beschreibung"
                className="h-10 bg-transparent"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  defaultValue={p.menge ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    if (v !== p.menge) onUpdate(p.id, { menge: v });
                  }}
                  className="h-10 w-24 font-mono tabular-nums"
                  placeholder="Menge"
                />
                <Select
                  value={einheit}
                  onValueChange={(v) => onUpdate(p.id, { einheit: v })}
                >
                  <SelectTrigger className="h-10 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EINHEITEN_MATERIAL.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 ml-auto text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(p.id)}
                  aria-label="Position löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        className={cn("w-full h-11 border-dashed")}
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Position hinzufügen
      </Button>
    </div>
  );
}
