import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Wrench, Package } from "lucide-react";
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
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold uppercase tracking-wider">Arbeit</h4>
        <span className="text-xs text-muted-foreground">({positionen.length})</span>
      </div>
      <div className="space-y-2">
        {positionen.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1">Noch keine Aufgabe.</p>
        )}
        {positionen.map((p) => {
          const checked = !!p.erledigt;
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-lg border p-2.5 flex items-center gap-2 transition-colors",
                checked
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-border bg-background/50",
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) =>
                  // erledigt is the source of truth; mirror to menge for legacy exports
                  onUpdate(p.id, { erledigt: !!v, menge: v ? 1 : 0, einheit: "Check" })
                }
                aria-label="Aufgabe erledigt"
                className={cn(
                  "h-6 w-6 shrink-0",
                  checked &&
                    "border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white",
                )}
              />
              <Input
                defaultValue={p.beschreibung ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (p.beschreibung ?? "")) onUpdate(p.id, { beschreibung: v });
                }}
                placeholder="Aufgabe"
                className={cn(
                  "h-10 bg-transparent flex-1 border-0 focus-visible:ring-0 px-2",
                  checked && "line-through text-muted-foreground",
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => onRemove(p.id)}
                aria-label="Aufgabe löschen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
