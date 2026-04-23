import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";

type Handler = (payload: {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}) => void;

// Hoisted-safe globals (vi.mock factory cannot reference module locals)
declare global {
  // eslint-disable-next-line no-var
  var __rtHandlers: Handler[];
  // eslint-disable-next-line no-var
  var __rtRemove: ReturnType<typeof vi.fn>;
}
globalThis.__rtHandlers = [];
globalThis.__rtRemove = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const queryBuilder: Record<string, unknown> = {};
  Object.assign(queryBuilder, {
    select: () => queryBuilder,
    eq: () => queryBuilder,
    order: () => Promise.resolve({ data: [], error: null }),
    insert: () => queryBuilder,
    update: () => queryBuilder,
    delete: () => queryBuilder,
    single: () => Promise.resolve({ data: null, error: null }),
  });

  return {
    supabase: {
      from: () => queryBuilder,
      channel: () => ({
        on: (_evt: string, _filter: object, handler: Handler) => {
          globalThis.__rtHandlers.push(handler);
          return { subscribe: () => ({}) };
        },
      }),
      removeChannel: globalThis.__rtRemove,
    },
  };
});

// Import AFTER vi.mock
import { usePositionenStore, type Position } from "@/stores/positionenStore";

const RID = "test-rapport-id";

describe("positionenStore realtime sync", () => {
  beforeEach(() => {
    globalThis.__rtHandlers.length = 0;
    globalThis.__rtRemove.mockClear();
    usePositionenStore.setState({ byRapport: {} });
  });

  it("immediately reflects realtime UPDATE on erledigt — no stale state", () => {
    const unsub = usePositionenStore.getState().subscribe(RID);

    act(() => {
      usePositionenStore.getState().applyOptimistic(RID, [
        {
          id: "p1", rapport_id: RID, typ: "arbeit", beschreibung: "Ölwechsel",
          menge: 0, einheit: "Check", erledigt: false, sort_order: 1,
        },
      ]);
    });

    expect(usePositionenStore.getState().getPositionen(RID)[0].erledigt).toBe(false);

    act(() => {
      globalThis.__rtHandlers.forEach((h) =>
        h({
          eventType: "UPDATE",
          new: {
            id: "p1", rapport_id: RID, typ: "arbeit", beschreibung: "Ölwechsel",
            menge: 1, einheit: "Check", erledigt: true, sort_order: 1,
          },
        }),
      );
    });

    const after = usePositionenStore.getState().getPositionen(RID);
    expect(after[0].erledigt).toBe(true);
    expect(after[0].menge).toBe(1);

    unsub();
  });

  it("removes a position on realtime DELETE", () => {
    const unsub = usePositionenStore.getState().subscribe(RID);

    act(() => {
      usePositionenStore.getState().applyOptimistic(RID, [
        {
          id: "p2", rapport_id: RID, typ: "material", beschreibung: "Filter",
          menge: 1, einheit: "Stk", erledigt: false, sort_order: 1,
        } satisfies Position,
      ]);
    });

    expect(usePositionenStore.getState().getPositionen(RID)).toHaveLength(1);

    act(() => {
      globalThis.__rtHandlers.forEach((h) => h({ eventType: "DELETE", old: { id: "p2" } }));
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
    expect(globalThis.__rtRemove).not.toHaveBeenCalled();

    unsub2();
    expect(usePositionenStore.getState().byRapport[RID]).toBeUndefined();
  });
});
