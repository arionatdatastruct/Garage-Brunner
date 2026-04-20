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
import { Check, ChevronDown, Loader2, Car, Wrench } from "lucide-react";
import { KATEGORIEN, parseKategorien, formatKategorien } from "@/lib/kategorien";
import { cn } from "@/lib/utils";

interface Rapport {
  id: string;
  updated_at?: string;
  kategorie: string | null;
  arbeit_beschreibung: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  kunde_strasse: string | null;
  kunde_plz: string | null;
  kunde_telefon: string | null;
  kunde_email: string | null;
  kennzeichen: string | null;
  marke: string | null;
  modell: string | null;
  chassis_nr: string | null;
}

interface Props {
  rapport: Rapport;
  onSaved: () => void;
}

type SaveState = "idle" | "saving" | "saved";

/* ---------- Validierung ---------- */

const validators = {
  plz: (v: string | null) => {
    if (!v) return null;
    return /^\d{4}$/.test(v.trim()) ? null : "PLZ muss 4 Ziffern haben";
  },
  email: (v: string | null) => {
    if (!v) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : "Ungültige E-Mail";
  },
  telefon: (v: string | null) => {
    if (!v) return null;
    // Erlaubt CH-Formate: +41..., 0xx xxx xx xx, mit/ohne Leerzeichen, /, -
    const cleaned = v.replace(/[\s\-/().]/g, "");
    return /^\+?\d{7,15}$/.test(cleaned) ? null : "Ungültige Telefonnummer";
  },
};

/* ---------- Kompakte Field-Primitives ---------- */

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
  "h-9 bg-transparent border-0 border-b border-border/60 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors";

const inputErrorCls = "border-destructive/70 focus-visible:border-destructive";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Car;
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

/* ---------- Hauptkomponente ---------- */

export function AuftragForm({ rapport, onSaved }: Props) {
  const [r, setR] = useState(rapport);
  const [state, setState] = useState<SaveState>("idle");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  // Letzte bekannte Server-Version: für optimistic concurrency.
  const lastUpdatedAt = useRef<string | undefined>(rapport.updated_at);

  useEffect(() => {
    setR(rapport);
    lastUpdatedAt.current = rapport.updated_at;
    dirty.current = false;
  }, [rapport]);

  const hasErrors = false;

  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    if (hasErrors) {
      setState("idle");
      return;
    }
    setState("saving");
    timer.current = setTimeout(async () => {
      try {
        // Optimistic concurrency: nur updaten, wenn updated_at noch unsere
        // bekannte Version ist. Sonst hat jemand anderes zwischenzeitlich gespeichert.
        let query = (supabase as any)
          .from("arbeitsrapporte")
          .update({
            kategorie: r.kategorie,
            arbeit_beschreibung: r.arbeit_beschreibung,
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
          // Niemand wurde aktualisiert => Versionskonflikt.
          setState("idle");
          dirty.current = false;
          toast.error("Auftrag wurde von jemand anderem geändert", {
            description: "Bitte neu laden, um die aktuelle Version zu sehen.",
            action: {
              label: "Neu laden",
              onClick: () => onSaved(),
            },
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
        <span className="text-xs font-medium text-muted-foreground">
          {hasErrors ? "Bitte Eingaben prüfen" : "Auto-Speichern aktiv"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full transition-all",
            hasErrors && "bg-destructive/15 text-destructive",
            !hasErrors && state === "saving" && "bg-amber-500/15 text-amber-500",
            !hasErrors && state === "saved" && "bg-emerald-500/15 text-emerald-500",
            !hasErrors && state === "idle" && "text-muted-foreground/60"
          )}
        >
          {hasErrors ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              Validierung
            </>
          ) : state === "saving" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Speichert
            </>
          ) : state === "saved" ? (
            <>
              <Check className="h-3 w-3" /> Gespeichert
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              Bereit
            </>
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
                  className="w-full justify-between font-normal min-h-9 h-auto py-1.5 bg-background/50"
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
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-left"
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

          <div className="grid grid-cols-2 gap-4">
            <Field label="Mechaniker">
              <Select
                value={r.mechaniker_zuweisung ?? ""}
                onValueChange={(v) => upd({ mechaniker_zuweisung: v as "Roman" | "Pascal" })}
              >
                <SelectTrigger className="h-9 bg-background/50">
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
            <Field label="Arbeitszeit (h)">
              <Input
                type="number"
                step="0.25"
                value={r.arbeitszeit_stunden ?? ""}
                onChange={(e) => upd({ arbeitszeit_stunden: num(e.target.value) })}
                className={cn(inputCls, "font-mono tabular-nums")}
                placeholder="0.00"
              />
            </Field>
          </div>

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

          <Field label="Arbeit / Beschreibung">
            <Textarea
              rows={3}
              value={r.arbeit_beschreibung ?? ""}
              onChange={(e) => upd({ arbeit_beschreibung: e.target.value })}
              className="resize-none bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary"
            />
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
      </div>
    </div>
  );
}
