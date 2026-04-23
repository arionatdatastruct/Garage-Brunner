import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Kunde {
  id: string;
  kundennummer: string | null;
  name: string | null;
  ort: string | null;
}

interface Props {
  fahrzeugId: string;
  onLinked: () => void;
  variant?: "inline" | "button";
}

/**
 * Verknüpft einen vorhandenen Kunden mit einem Fahrzeug.
 * Wird auf der Auftragsdetail-Seite eingeblendet, wenn das
 * Fahrzeug noch keinen Kunden zugewiesen hat — so füllen sich
 * Kundendaten in Vorschau & PDF automatisch.
 */
export function KundeLinkPicker({ fahrzeugId, onLinked, variant = "inline" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      const { data, error } = await (supabase as any)
        .from("kunden")
        .select("id, kundennummer, name, ort")
        .order("name", { ascending: true })
        .limit(200);
      if (error) toast.error("Kunden konnten nicht geladen werden");
      setKunden((data as Kunde[]) ?? []);
      setLoading(false);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return kunden;
    return kunden.filter((k) =>
      [k.name, k.kundennummer, k.ort]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [kunden, query]);

  const link = async (kundeId: string) => {
    setLinkingId(kundeId);
    const { error } = await (supabase as any)
      .from("fahrzeuge")
      .update({ kunde_id: kundeId })
      .eq("id", fahrzeugId);
    setLinkingId(null);
    if (error) {
      toast.error("Verknüpfung fehlgeschlagen");
      return;
    }
    toast.success("Kunde verknüpft");
    setOpen(false);
    onLinked();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "inline" ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition active:scale-95"
          >
            <UserPlus className="h-3.5 w-3.5" /> Kunde verknüpfen
          </button>
        ) : (
          <Button variant="outline" size="sm" className="h-9">
            <UserPlus className="h-4 w-4 mr-1.5" /> Kunde verknüpfen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kunde mit Fahrzeug verknüpfen</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, Kundennummer oder Ort…"
            className="pl-9 h-11"
            autoFocus
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto -mx-6 px-6 space-y-1">
          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Lade Kunden…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-6">
              Keine Kunden gefunden.
            </p>
          )}
          {!loading &&
            filtered.map((k) => (
              <button
                type="button"
                key={k.id}
                onClick={() => link(k.id)}
                disabled={linkingId !== null}
                className={cn(
                  "w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition",
                  "flex items-center justify-between gap-3",
                  linkingId === k.id && "opacity-60",
                )}
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{k.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[k.kundennummer && `#${k.kundennummer}`, k.ort].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {linkingId === k.id && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
              </button>
            ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
