import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { usePositionenStore, type Position } from "@/stores/positionenStore";

// ---- Mock Supabase realtime channel ----
type Handler = (payload: {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Partial<Position>;
  old?: Partial<Position>;
}) => void;

const handlers: Handler[] = [];
const removeChannel = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const queryBuilder = {
    select: () => queryBuilder,
    eq: () => queryBuilder,
    order: () => queryBuilder,
    insert: () => queryBuilder,
    update: () => queryBuilder,
    delete: () => queryBuilder,
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (v: { data: Position[]; error: null }) => void) =>
      resolve({ data: [], error: null }),
  };

  return {
    supabase: {
      from: () => queryBuilder,
      channel: () => ({
        on: (_evt: string, _filter: object, handler: Handler) => {
          handlers.push(handler);
          return {
            subscribe: () => ({
              on: () => ({}),
            }),
          };
        },
      }),
      removeChannel,
    },
  };
});

const RID = "test-rapport-id";

describe("positionenStore realtime sync", () => {
  beforeEach(() => {
    handlers.length = 0;
    removeChannel.mockClear();
    // Reset store
    usePositionenStore.setState({ byRapport: {} });
  });

  it("immediately reflects realtime UPDATE on erledigt — no stale state", async () => {
    const unsub = usePositionenStore.getState().subscribe(RID);

    // Seed store as if initial fetch returned one task
    act(() => {
      usePositionenStore.getState().applyOptimistic(RID, [
        {
          id: "p1",
          rapport_id: RID,
          typ: "arbeit",
          beschreibung: "Ölwechsel",
          menge: 0,
          einheit: "Check",
          erledigt: false,
          sort_order: 1,
        },
      ]);
    });

    expect(usePositionenStore.getState().getPositionen(RID)[0].erledigt).toBe(false);

    // Simulate Supabase realtime UPDATE event from another tab/source
    act(() => {
      handlers.forEach((h) =>
        h({
          eventType: "UPDATE",
          new: {
            id: "p1",
            rapport_id: RID,
            typ: "arbeit",
            beschreibung: "Ölwechsel",
            menge: 1,
            einheit: "Check",
            erledigt: true,
            sort_order: 1,
          },
        }),
      );
    });

    const after = usePositionenStore.getState().getPositionen(RID);
    expect(after).toHaveLength(1);
    expect(after[0].erledigt).toBe(true);
    expect(after[0].menge).toBe(1);

    unsub();
  });

  it("removes a position on realtime DELETE", () => {
    const unsub = usePositionenStore.getState().subscribe(RID);

    act(() => {
      usePositionenStore.getState().applyOptimistic(RID, [
        {
          id: "p2",
          rapport_id: RID,
          typ: "material",
          beschreibung: "Filter",
          menge: 1,
          einheit: "Stk",
          erledigt: false,
          sort_order: 1,
        },
      ]);
    });

    expect(usePositionenStore.getState().getPositionen(RID)).toHaveLength(1);

    act(() => {
      handlers.forEach((h) => h({ eventType: "DELETE", old: { id: "p2" } }));
    });

    expect(usePositionenStore.getState().getPositionen(RID)).toHaveLength(0);
    unsub();
  });

  it("ref-counts subscriptions and tears down channel on last unsubscribe", () => {
    const unsub1 = usePositionenStore.getState().subscribe(RID);
    const unsub2 = usePositionenStore.getState().subscribe(RID);

    expect(usePositionenStore.getState().byRapport[RID]?.refCount).toBe(2);

    unsub1();
    expect(usePositionenStore.getState().byRapport[RID]?.refCount).toBe(1);
    expect(removeChannel).not.toHaveBeenCalled();

    unsub2();
    expect(usePositionenStore.getState().byRapport[RID]).toBeUndefined();
  });
});
