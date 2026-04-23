/**
 * Shared store for `rapport_positionen` keyed by rapportId.
 *
 * Single source of truth: Supabase Realtime. The store subscribes once per
 * rapportId (ref-counted), keeps the cache in sync via INSERT/UPDATE/DELETE
 * events, and exposes mutators that perform optimistic local updates +
 * persist to DB. No window CustomEvents.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type PositionTyp = "arbeit" | "material";

export interface Position {
  id: string;
  rapport_id: string;
  typ: PositionTyp;
  beschreibung: string | null;
  menge: number | null;
  einheit: string | null;
  erledigt: boolean;
  sort_order: number;
}

interface RapportEntry {
  positionen: Position[];
  loading: boolean;
  refCount: number;
  channel: ReturnType<typeof supabase.channel> | null;
}

interface State {
  byRapport: Record<string, RapportEntry>;
}

interface Actions {
  subscribe: (rapportId: string) => () => void;
  getPositionen: (rapportId: string) => Position[];
  isLoading: (rapportId: string) => boolean;
  applyOptimistic: (rapportId: string, next: Position[]) => void;
  upsertLocal: (rapportId: string, p: Position) => void;
  removeLocal: (rapportId: string, id: string) => void;
}

const sortFn = (a: Position, b: Position) =>
  a.typ === b.typ ? a.sort_order - b.sort_order : a.typ.localeCompare(b.typ);

export const usePositionenStore = create<State & Actions>((set, get) => ({
  byRapport: {},

  getPositionen: (rapportId) => get().byRapport[rapportId]?.positionen ?? [],
  isLoading: (rapportId) => get().byRapport[rapportId]?.loading ?? true,

  applyOptimistic: (rapportId, next) => {
    set((s) => ({
      byRapport: {
        ...s.byRapport,
        [rapportId]: {
          ...(s.byRapport[rapportId] ?? { refCount: 0, channel: null, loading: false, positionen: [] }),
          positionen: [...next].sort(sortFn),
        },
      },
    }));
  },

  upsertLocal: (rapportId, p) => {
    set((s) => {
      const entry = s.byRapport[rapportId];
      if (!entry) return s;
      const exists = entry.positionen.some((x) => x.id === p.id);
      const positionen = exists
        ? entry.positionen.map((x) => (x.id === p.id ? p : x))
        : [...entry.positionen, p];
      return {
        byRapport: {
          ...s.byRapport,
          [rapportId]: { ...entry, positionen: positionen.sort(sortFn) },
        },
      };
    });
  },

  removeLocal: (rapportId, id) => {
    set((s) => {
      const entry = s.byRapport[rapportId];
      if (!entry) return s;
      return {
        byRapport: {
          ...s.byRapport,
          [rapportId]: {
            ...entry,
            positionen: entry.positionen.filter((x) => x.id !== id),
          },
        },
      };
    });
  },

  subscribe: (rapportId) => {
    const existing = get().byRapport[rapportId];
    if (existing) {
      set((s) => ({
        byRapport: {
          ...s.byRapport,
          [rapportId]: { ...existing, refCount: existing.refCount + 1 },
        },
      }));
    } else {
      set((s) => ({
        byRapport: {
          ...s.byRapport,
          [rapportId]: { positionen: [], loading: true, refCount: 1, channel: null },
        },
      }));

      // Initial fetch
      void (async () => {
        const { data } = await (supabase as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (c: string, v: string) => {
                order: (c: string) => { order: (c: string) => Promise<{ data: Position[] | null }> };
              };
            };
          };
        })
          .from("rapport_positionen")
          .select("*")
          .eq("rapport_id", rapportId)
          .order("typ")
          .order("sort_order");

        set((s) => {
          const entry = s.byRapport[rapportId];
          if (!entry) return s;
          return {
            byRapport: {
              ...s.byRapport,
              [rapportId]: {
                ...entry,
                positionen: ((data ?? []) as Position[]).sort(sortFn),
                loading: false,
              },
            },
          };
        });
      })();

      // Realtime subscription — single source of truth
      const channel = supabase
        .channel(`positionen-${rapportId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "rapport_positionen",
            filter: `rapport_id=eq.${rapportId}`,
          },
          (payload) => {
            const { eventType } = payload;
            if (eventType === "DELETE") {
              const oldId = (payload.old as { id?: string })?.id;
              if (oldId) get().removeLocal(rapportId, oldId);
            } else if (eventType === "INSERT" || eventType === "UPDATE") {
              const row = payload.new as Position;
              if (row?.id) get().upsertLocal(rapportId, row);
            }
          },
        )
        .subscribe();

      set((s) => {
        const entry = s.byRapport[rapportId];
        if (!entry) return s;
        return {
          byRapport: { ...s.byRapport, [rapportId]: { ...entry, channel } },
        };
      });
    }

    // Unsubscribe (ref-counted)
    return () => {
      const entry = get().byRapport[rapportId];
      if (!entry) return;
      const nextCount = entry.refCount - 1;
      if (nextCount <= 0) {
        if (entry.channel) supabase.removeChannel(entry.channel);
        set((s) => {
          const copy = { ...s.byRapport };
          delete copy[rapportId];
          return { byRapport: copy };
        });
      } else {
        set((s) => ({
          byRapport: {
            ...s.byRapport,
            [rapportId]: { ...entry, refCount: nextCount },
          },
        }));
      }
    };
  },
}));

// ---------- Mutators (debounced where appropriate) ----------

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Persist a patch to DB with per-(id, field-set) debounce to avoid races. */
export async function persistUpdate(
  id: string,
  patch: Partial<Omit<Position, "id" | "rapport_id">>,
  debounceMs = 0,
) {
  const run = async () => {
    const { error } = await (supabase as unknown as {
      from: (t: string) => {
        update: (p: object) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
      };
    })
      .from("rapport_positionen")
      .update(patch)
      .eq("id", id);
    return error;
  };

  if (debounceMs <= 0) return run();

  return new Promise<unknown>((resolve) => {
    const prev = debounceTimers.get(id);
    if (prev) clearTimeout(prev);
    const t = setTimeout(async () => {
      debounceTimers.delete(id);
      resolve(await run());
    }, debounceMs);
    debounceTimers.set(id, t);
  });
}
