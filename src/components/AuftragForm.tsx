import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, ShieldCheck, Wrench, AlertTriangle, Minus, Plus, ListChecks } from "lucide-react";
import { KATEGORIEN, parseKategorien, formatKategorien } from "@/lib/kategorien";
import { cn } from "@/lib/utils";
import { PositionenEditor } from "@/components/PositionenEditor";

interface Rapport {
  id: string;
  updated_at?: string;
  kategorie: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  sicherheitscheck?: Record<string, unknown> | null;
}

interface Props {
  rapport: Rapport;
  onSaved: () => void;
}

/* ---------- Sicherheitscheck-Konfig ---------- */
const SAFETY_CHECKS = [
  { key: "bremsen_vorne", label: "Bremsen vorne" },
  { key: "bremsen_hinten", label: "Bremsen hinten" },
  { key: "beleuchtung", label: "Beleuchtung" },
  { key: "fluessigkeiten", label: "Flüssigkeitsstände" },
  { key: "unterboden", label: "Unterboden / Auspuff" },
] as const;

// Vereinfacht auf zwei Stati. "gelb" aus Altdaten wird im UI als "ok" interpretiert.
type SafetyStatus = "" | "ok" | "mangel";

type SaveState = "idle" | "saving" | "saved";

/* ---------- Field-Primitives ---------- */

function Field({
  label,
  children,
  className,
  error,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  error?: string | null;
}) {
  return (
    <label className={cn("block space-y-1", className)} data-error={error ? "true" : undefined}>
      <span
        className={cn(
          "text-[11px] uppercase tracking-wider font-medium transition-colors",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      {children}
      {error && <span className="block text-[10px] text-destructive mt-0.5">{error}</span>}
    </label>
  );
}

const inputCls =
  "h-10 bg-transparent border-0 border-b border-border/60 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Wrench;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* ---------- Arbeitszeit-Stepper ---------- */
function StundenStepper({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const v = value ?? 0;
  const dec = () => onChange(Math.max(0, +(v - 0.25).toFixed(2)));
  const inc = () => onChange(+(v + 0.25).toFixed(2));
  return (
    <div className="flex items-stretch gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={dec}
        className="h-12 w-12 shrink-0 text-lg"
        aria-label="0.25h weniger"
      >
        <Minus className="h-5 w-5" />
      </Button>
      <Input
        type="number"
        step="0.25"
        min="0"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="h-12 flex-1 text-center font-mono tabular-nums text-lg font-semibold bg-background/60"
        placeholder="0.00"
        inputMode="decimal"
      />
      <Button
        type="button"
        variant="outline"
        onClick={inc}
        className="h-12 w-12 shrink-0 text-lg"
        aria-label="0.25h mehr"
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
}

/* ---------- Hauptkomponente ---------- */

export function AuftragForm({ rapport, onSaved }: Props) {
  const [r, setR] = useState(rapport);
  const [state, setState] = useState<SaveState>("idle");

  // Sicherheitscheck-State: Status + Bemerkung pro Key.
  const initSafety = (): { status: Record<string, SafetyStatus>; bem: Record<string, string> } => {
    const status: Record<string, SafetyStatus> = {};
    const bem: Record<string, string> = {};
    const sc = (rapport.sicherheitscheck ?? {}) as Record<string, unknown>;
    SAFETY_CHECKS.forEach((c) => {
      const raw = sc[c.key];
      // Legacy: "gruen"/"gelb" → ok, "rot" → mangel
      if (raw === "rot" || raw === "mangel") status[c.key] = "mangel";
      else if (raw === "ok" || raw === "gruen" || raw === "gelb") status[c.key] = "ok";
      else status[c.key] = "";
      bem[c.key] = (sc[`${c.key}_bemerkung`] as string) ?? "";
    });
    return { status, bem };
  };
  const initial = initSafety();
  const [safety, setSafety] = useState<Record<string, SafetyStatus>>(initial.status);
  const [bemerkungen, setBemerkungen] = useState<Record<string, string>>(initial.bem);
  const safetyDirty = useRef(false);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [safetySave, setSafetySave] = useState<SaveState>("idle");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const lastUpdatedAt = useRef<string | undefined>(rapport.updated_at);

  useEffect(() => {
    setR(rapport);
    lastUpdatedAt.current = rapport.updated_at;
    dirty.current = false;
    const init = initSafety();
    setSafety(init.status);
    setBemerkungen(init.bem);
    safetyDirty.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rapport]);

  // Auto-Save Sicherheitscheck (Status + Bemerkungen zusammen)
  useEffect(() => {
    if (!safetyDirty.current) return;
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    setSafetySave("saving");
    safetyTimer.current = setTimeout(async () => {
      try {
        const payload: Record<string, unknown> = {};
        SAFETY_CHECKS.forEach((c) => {
          payload[c.key] = safety[c.key] || "";
          if (safety[c.key] === "mangel") {
            payload[`${c.key}_bemerkung`] = bemerkungen[c.key] ?? "";
          }
        });
        const { error } = await (supabase as any)
          .from("arbeitsrapporte")
          .update({ sicherheitscheck: payload })
          .eq("id", rapport.id);
        if (error) throw error;
        safetyDirty.current = false;
        setSafetySave("saved");
        onSaved();
        setTimeout(() => setSafetySave("idle"), 1500);
      } catch (e: any) {
        setSafetySave("idle");
        toast.error(e.message ?? "Fehler beim Speichern");
      }
    }, 600);
    return () => {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safety, bemerkungen]);

  const setSafetyValue = (key: string, status: SafetyStatus) => {
    safetyDirty.current = true;
    setSafety((prev) => {
      const next = prev[key] === status ? "" : status;
      // Bemerkung verwerfen, sobald wir "mangel" verlassen — sonst taucht der
      // alte Text beim nächsten Mangel-Klick wieder auf.
      if (prev[key] === "mangel" && next !== "mangel") {
        setBemerkungen((b) => ({ ...b, [key]: "" }));
      }
      return { ...prev, [key]: next };
    });
  };
  const setBemerkung = (key: string, text: string) => {
    safetyDirty.current = true;
    setBemerkungen((prev) => ({ ...prev, [key]: text }));
  };

  const safetyCounts = Object.values(safety).reduce(
    (a, v) => {
      if (v === "mangel") a.mangel++;
      else if (v === "ok") a.ok++;
      return a;
    },
    { ok: 0, mangel: 0 }
  );
  const safetyHasMangel = safetyCounts.mangel > 0;

  const hasErrors = false;

  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    setState("saving");
    timer.current = setTimeout(async () => {
      try {
        let query = (supabase as any)
          .from("arbeitsrapporte")
          .update({
            kategorie: r.kategorie,
            arbeitszeit_stunden: r.arbeitszeit_stunden,
            mechaniker_zuweisung: r.mechaniker_zuweisung,
            auftragswert_chf: r.auftragswert_chf,
            notizen: r.notizen,
          })
          .eq("id", r.id);
        if (lastUpdatedAt.current) {
          query = query.eq("updated_at", lastUpdatedAt.current);
        }
        const { data, error } = await query.select("updated_at");
        if (error) throw error;
        if (!data || data.length === 0) {
          setState("idle");
          dirty.current = false;
          toast.error("Auftrag wurde von jemand anderem geändert", {
            description: "Bitte neu laden, um die aktuelle Version zu sehen.",
            action: { label: "Neu laden", onClick: () => onSaved() },
            duration: 10000,
          });
          return;
        }
        lastUpdatedAt.current = data[0]?.updated_at ?? lastUpdatedAt.current;
        dirty.current = false;
        setState("saved");
        onSaved();
        setTimeout(() => setState("idle"), 1500);
      } catch (e: any) {
        setState("idle");
        toast.error(e.message ?? "Fehler beim Speichern");
      }
    }, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, hasErrors]);

  const upd = (patch: Partial<Rapport>) => {
    dirty.current = true;
    setR((prev) => ({ ...prev, ...patch }));
  };

  const num = (v: string) => (v === "" ? null : Number(v));

  const selectedIds = parseKategorien(r.kategorie);
  const toggleKat = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    upd({ kategorie: formatKategorien(next) });
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm">
      {/* Sticky Save-Indikator */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur rounded-t-xl">
        <span className="text-xs font-medium text-muted-foreground">Auto-Speichern aktiv</span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full transition-all",
            state === "saving" && "bg-amber-500/15 text-amber-500",
            state === "saved" && "bg-emerald-500/15 text-emerald-500",
            state === "idle" && "text-muted-foreground/70"
          )}
        >
          {state === "saving" ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Speichert</>
          ) : state === "saved" ? (
            <><Check className="h-3 w-3" /> Gespeichert</>
          ) : (
            <><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" /> Bereit</>
          )}
        </span>
      </div>

      <div className="p-4 md:p-5 space-y-7">
        {/* Auftrag */}
        <Section icon={Wrench} title="Auftrag">
          <Field label="Kategorie">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal min-h-11 h-auto py-1.5 bg-background/50"
                >
                  <span className="flex flex-wrap gap-1 items-center">
                    {selectedIds.length === 0 ? (
                      <span className="text-muted-foreground">Wählen…</span>
                    ) : (
                      selectedIds.map((id) => {
                        const k = KATEGORIEN.find((x) => x.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="font-mono text-[10px] gap-1">
                            <span className="text-muted-foreground">{id}</span>
                            <span>{k?.label ?? ""}</span>
                          </Badge>
                        );
                      })
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
                {KATEGORIEN.map((k) => {
                  const checked = selectedIds.includes(k.id);
                  return (
                    <button
                      type="button"
                      key={k.id}
                      onClick={() => toggleKat(k.id)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent text-left"
                    >
                      <Checkbox checked={checked} className="pointer-events-none" />
                      <span className="font-mono text-xs text-muted-foreground w-6">{k.id}</span>
                      <span>{k.label}</span>
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </Field>

          <Field label="Mechaniker">
            <Select
              value={r.mechaniker_zuweisung ?? ""}
              onValueChange={(v) => upd({ mechaniker_zuweisung: v as "Roman" | "Pascal" })}
            >
              <SelectTrigger className="h-11 bg-background/50">
                <SelectValue placeholder="Wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Roman">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" /> Roman
                  </span>
                </SelectItem>
                <SelectItem value="Pascal">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-violet-500" /> Pascal
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Arbeitszeit (Stunden)">
            <StundenStepper
              value={r.arbeitszeit_stunden}
              onChange={(v) => upd({ arbeitszeit_stunden: v })}
            />
          </Field>

          <Field label="Auftragswert (CHF)">
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                CHF
              </span>
              <Input
                type="number"
                step="0.05"
                value={r.auftragswert_chf ?? ""}
                onChange={(e) => upd({ auftragswert_chf: num(e.target.value) })}
                className={cn(inputCls, "font-mono tabular-nums text-base font-semibold pl-10")}
                placeholder="0.00"
              />
            </div>
          </Field>

          <Field label="Notizen">
            <Textarea
              rows={2}
              value={r.notizen ?? ""}
              onChange={(e) => upd({ notizen: e.target.value })}
              className="resize-none bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary"
              placeholder="Interne Bemerkungen…"
            />
          </Field>
        </Section>

        {/* Positionen (Arbeit + Material) */}
        <Section icon={ListChecks} title="Positionen">
          <PositionenEditor rapportId={rapport.id} />
        </Section>

        {/* Sicherheitscheck */}
        <Section icon={ShieldCheck} title="Sicherheitscheck">
          {safetyHasMangel && (
            <div className="flex items-center gap-2 px-3 py-2 -mt-2 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {safetyCounts.mangel} {safetyCounts.mangel === 1 ? "Mangel" : "Mängel"} festgestellt
            </div>
          )}
          <div className="space-y-3">
            {SAFETY_CHECKS.map((c) => {
              const current = safety[c.key] ?? "";
              return (
                <div
                  key={c.key}
                  className="rounded-lg border border-border bg-background/40 p-3 space-y-2"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium break-words">{c.label}</span>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                      <button
                        type="button"
                        onClick={() => setSafetyValue(c.key, "ok")}
                        aria-pressed={current === "ok"}
                        className={cn(
                          "h-12 px-3 rounded-lg border text-sm font-semibold transition flex items-center justify-center gap-1.5 min-w-0",
                          current === "ok"
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                            : "bg-background border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Check className="h-4 w-4 shrink-0" strokeWidth={3} /> OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setSafetyValue(c.key, "mangel")}
                        aria-pressed={current === "mangel"}
                        className={cn(
                          "h-12 px-3 rounded-lg border text-sm font-semibold transition flex items-center justify-center gap-1.5 min-w-0",
                          current === "mangel"
                            ? "bg-red-500 text-white border-red-500 shadow-sm"
                            : "bg-background border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0" /> Mangel
                      </button>
                    </div>
                  </div>
                  {current === "mangel" && (
                    <Textarea
                      rows={2}
                      value={bemerkungen[c.key] ?? ""}
                      onChange={(e) => setBemerkung(c.key, e.target.value)}
                      placeholder="Bemerkung zum Mangel*"
                      className="resize-none bg-background/60 border-destructive/30 focus-visible:ring-1 focus-visible:ring-destructive"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
            <span>
              {SAFETY_CHECKS.length - safetyCounts.ok - safetyCounts.mangel} offen
            </span>
            <div className="flex items-center gap-3 font-mono tabular-nums">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {safetyCounts.ok}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {safetyCounts.mangel}
              </span>
              {safetySave === "saving" && <Loader2 className="h-3 w-3 animate-spin text-amber-500" />}
              {safetySave === "saved" && <Check className="h-3 w-3 text-emerald-500" />}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
