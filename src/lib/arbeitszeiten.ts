import { getDay } from "date-fns";

// Mo–Do: 07:30–12:00 (4.5h) + 13:30–18:00 (4.5h) = 9.0
// Fr:    07:30–12:00 (4.5h) + 13:30–17:00 (3.5h) = 8.0
// Sa/So: 0
export function kapazitaetFuer(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = getDay(d); // 0 = So, 1 = Mo, ... 6 = Sa
  if (day === 0 || day === 6) return 0;
  if (day === 5) return 8;
  return 9;
}

export function istArbeitstag(date: Date | string): boolean {
  return kapazitaetFuer(date) > 0;
}

export function zeitfensterFuer(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = getDay(d);
  if (day === 0 || day === 6) return "Frei";
  if (day === 5) return "07:30–12:00 · 13:30–17:00";
  return "07:30–12:00 · 13:30–18:00";
}

export function auslastungsFarbe(verplant: number, kapazitaet: number): "ok" | "warn" | "over" {
  if (kapazitaet === 0) return "ok";
  const pct = verplant / kapazitaet;
  if (pct > 1) return "over";
  if (pct >= 0.8) return "warn";
  return "ok";
}
