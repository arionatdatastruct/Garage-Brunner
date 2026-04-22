import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Wrench, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export type PositionTyp = "arbeit" | "material";

export interface Position {
  id: string;
  rapport_id: string;
  typ: PositionTyp;
  beschreibung: string | null;
  menge: number | null;
  einheit: string | null;
  sort_order: number;
}

interface Props {
  rapportId: string;
}

const EINHEITEN_ARBEIT = ["Std", "Pauschal"];
const EINHEITEN_MATERIAL = ["Stk", "Liter", "m", "Set", "kg", "Pauschal"];

export function PositionenEditor({ rapportId }: Props) {
  const [positionen, setPositionen] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("rapport_positionen")
      .select("*")
      .eq("rapport_id", rapportId)
      .order("typ")
      .order("sort_order");
    if (error) toast.error("Positionen konnten nicht geladen werden");
    setPositionen((data ?? []) as Position[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rapportId]);

  const arbeit = positionen.filter((p) => p.typ === "arbeit");
  const material = positionen.filter((p) => p.typ === "material");

  const addPos = async (typ: PositionTyp) => {
    const sort_order =
      Math.max(0, ...positionen.filter((p) => p.typ === typ).map((p) => p.sort_order)) + 1;
    const einheit = typ === "arbeit" ? "Std" : "Stk";
    const { data, error } = await (supabase as any)
      .from("rapport_positionen")
      .insert({
        rapport_id: rapportId,
        typ,
        beschreibung: "",
        menge: 1,
        einheit,
        sort_order,
      })
      .select()
      .single();
    if (error) {
      toast.error("Position konnte nicht angelegt werden");
      return;
    }
    setPositionen((prev) => [...prev, data as Position]);
  };

  const updatePos = async (id: string, patch: Partial<Position>) => {
    // optimistic
    setPositionen((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await (supabase as any)
      .from("rapport_positionen")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error("Speichern fehlgeschlagen");
      void load();
    }
  };

  const removePos = async (id: string) => {
    const prev = positionen;
    setPositionen((p) => p.filter((x) => x.id !== id));
    const { error } = await (supabase as any)
      .from("rapport_positionen")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen");
      setPositionen(prev);
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
      <Sektion
        icon={Wrench}
        titel="Arbeit"
        positionen={arbeit}
        einheiten={EINHEITEN_ARBEIT}
        onAdd={() => addPos("arbeit")}
        onUpdate={updatePos}
        onRemove={removePos}
      />
      <Sektion
        icon={Package}
        titel="Material"
        positionen={material}
        einheiten={EINHEITEN_MATERIAL}
        onAdd={() => addPos("material")}
        onUpdate={updatePos}
        onRemove={removePos}
      />
    </div>
  );
}

function Sektion({
  icon: Icon,
  titel,
  positionen,
  einheiten,
  onAdd,
  onUpdate,
  onRemove,
}: {
  icon: typeof Wrench;
  titel: string;
  positionen: Position[];
  einheiten: string[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Position>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold uppercase tracking-wider">{titel}</h4>
        <span className="text-xs text-muted-foreground">({positionen.length})</span>
      </div>
      <div className="space-y-2">
        {positionen.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1">Noch keine Position.</p>
        )}
        {positionen.map((p) => (
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
                value={p.einheit ?? ""}
                onValueChange={(v) => onUpdate(p.id, { einheit: v })}
              >
                <SelectTrigger className="h-10 w-28">
                  <SelectValue placeholder="Einheit" />
                </SelectTrigger>
                <SelectContent>
                  {einheiten.map((e) => (
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
        ))}
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
