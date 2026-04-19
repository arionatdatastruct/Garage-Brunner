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
import { Check, ChevronDown, Loader2, Car, Wrench, User } from "lucide-react";
import { KATEGORIEN, parseKategorien, formatKategorien } from "@/lib/kategorien";
import { cn } from "@/lib/utils";

interface Rapport {
  id: string;
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

  useEffect(() => {
    setR(rapport);
    dirty.current = false;
  }, [rapport]);

  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    setState("saving");
    timer.current = setTimeout(async () => {
      try {
        const { error } = await (supabase as any)
          .from("arbeitsrapporte")
          .update({
            kategorie: r.kategorie,
            arbeit_beschreibung: r.arbeit_beschreibung,
            arbeitszeit_stunden: r.arbeitszeit_stunden,
            mechaniker_zuweisung: r.mechaniker_zuweisung,
            auftragswert_chf: r.auftragswert_chf,
            notizen: r.notizen,
            kundennummer: r.kundennummer,
            kunde_name: r.kunde_name,
            kunde_ort: r.kunde_ort,
            kunde_strasse: r.kunde_strasse,
            kunde_plz: r.kunde_plz,
            kunde_telefon: r.kunde_telefon,
            kunde_email: r.kunde_email,
            kennzeichen: r.kennzeichen,
            marke: r.marke,
            modell: r.modell,
            chassis_nr: r.chassis_nr,
          })
          .eq("id", r.id);
        if (error) throw error;
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
  }, [r]);

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
            state === "idle" && "text-muted-foreground/60"
          )}
        >
          {state === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Speichert
            </>
          )}
          {state === "saved" && (
            <>
              <Check className="h-3 w-3" /> Gespeichert
            </>
          )}
          {state === "idle" && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              Bereit
            </>
          )}
        </span>
      </div>

      <div className="p-4 md:p-5 space-y-7">
        {/* Fahrzeug */}
        <Section icon={Car} title="Fahrzeug">
          <Field label="Kennzeichen">
            <Input
              value={r.kennzeichen ?? ""}
              onChange={(e) => upd({ kennzeichen: e.target.value })}
              className={cn(inputCls, "font-mono text-base font-semibold tracking-wider uppercase")}
              placeholder="BE 123 456"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Marke">
              <Input value={r.marke ?? ""} onChange={(e) => upd({ marke: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Modell">
              <Input value={r.modell ?? ""} onChange={(e) => upd({ modell: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Chassis-Nr.">
            <Input
              value={r.chassis_nr ?? ""}
              onChange={(e) => upd({ chassis_nr: e.target.value })}
              className={cn(inputCls, "font-mono text-xs")}
            />
          </Field>
        </Section>

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

        {/* Kunde */}
        <Section icon={User} title="Kunde">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Kd-Nr." className="col-span-1">
              <Input
                value={r.kundennummer ?? ""}
                onChange={(e) => upd({ kundennummer: e.target.value })}
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field label="Name" className="col-span-2">
              <Input
                value={r.kunde_name ?? ""}
                onChange={(e) => upd({ kunde_name: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Strasse">
            <Input
              value={r.kunde_strasse ?? ""}
              onChange={(e) => upd({ kunde_strasse: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="PLZ">
              <Input
                value={r.kunde_plz ?? ""}
                onChange={(e) => upd({ kunde_plz: e.target.value })}
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field label="Ort" className="col-span-2">
              <Input
                value={r.kunde_ort ?? ""}
                onChange={(e) => upd({ kunde_ort: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Telefon">
              <Input
                value={r.kunde_telefon ?? ""}
                onChange={(e) => upd({ kunde_telefon: e.target.value })}
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field label="E-Mail">
              <Input
                type="email"
                value={r.kunde_email ?? ""}
                onChange={(e) => upd({ kunde_email: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>
      </div>
    </div>
  );
}
