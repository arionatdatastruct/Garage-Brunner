import { useEffect } from "react";

/**
 * Hält den Bildschirm wach (Screen Wake Lock API), solange Komponente gemountet
 * und `enabled` true ist. Re-acquired automatisch bei Tab-Wechsel.
 * Stiller no-op auf Browsern ohne Support (z.B. älteres iOS Safari).
 */
export function useWakeLock(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined") return;
    const wl = (navigator as any).wakeLock;
    if (!wl?.request) return;

    let lock: any = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const next = await wl.request("screen");
        if (cancelled) {
          await next.release().catch(() => {});
          return;
        }
        lock = next;
        lock.addEventListener?.("release", () => {
          // ignore — wir versuchen es bei visibilitychange erneut
        });
      } catch {
        /* user gesture / battery saver — ignorieren */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !lock) {
        acquire();
      }
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release?.().catch(() => {});
      lock = null;
    };
  }, [enabled]);
}
