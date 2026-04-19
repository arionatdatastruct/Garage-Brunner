import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { KATEGORIEN, parseKategorien, formatKategorien } from "@/lib/kategorien";

interface Rapport {
  id: string;
  kategorie: string | null;
  arbeit_beschreibung: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
  // Kunde-Snapshot
  kundennummer: string | null;
  kunde_name: string | null;
  kunde_ort: string | null;
  kunde_strasse: string | null;
  kunde_plz: string | null;
  kunde_telefon: string | null;
  kunde_email: string | null;
  // Fahrzeug-Snapshot
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

export function AuftragForm({ rapport, onSaved }: Props) {
  const [r, setR] = useState(rapport);
  const [state, setState] = useState<SaveState>("idle");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    setR(rapport);
    dirty.current = false;
  }, [rapport]);

  // Auto-save (alle Felder in einem Update — ein Tabellen-Target)
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

  const SaveIndicator = ({ state }: { state: SaveState }) => (
    <span className="text-xs text-muted-foreground flex items-center gap-1 min-h-[1rem]">
      {state === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" /> Speichert…
        </>
      )}
      {state === "saved" && (
        <>
          <Check className="h-3 w-3 text-green-500" /> Gespeichert
        </>
      )}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Fahrzeug */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Fahrzeug</CardTitle>
          <SaveIndicator state={state} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Kennzeichen</Label>
            <Input
              value={r.kennzeichen ?? ""}
              onChange={(e) => upd({ kennzeichen: e.target.value })}
              className="font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Marke</Label>
              <Input value={r.marke ?? ""} onChange={(e) => upd({ marke: e.target.value })} />
            </div>
            <div>
              <Label>Modell</Label>
              <Input value={r.modell ?? ""} onChange={(e) => upd({ modell: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Chassis-Nr.</Label>
            <Input
              value={r.chassis_nr ?? ""}
              onChange={(e) => upd({ chassis_nr: e.target.value })}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Auftrag */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Auftrag</CardTitle>
          <SaveIndicator state={state} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Kategorie</Label>
            {(() => {
              const selectedIds = parseKategorien(r.kategorie);
              const toggle = (id: string) => {
                const next = selectedIds.includes(id)
                  ? selectedIds.filter((x) => x !== id)
                  : [...selectedIds, id];
                upd({ kategorie: formatKategorien(next) });
              };
              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal min-h-10 h-auto py-1.5"
                    >
                      <span className="flex flex-wrap gap-1 items-center min-h-[1.5rem]">
                        {selectedIds.length === 0 ? (
                          <span className="text-muted-foreground">Wählen</span>
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
                          onClick={() => toggle(k.id)}
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
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mechaniker</Label>
              <Select
                value={r.mechaniker_zuweisung ?? ""}
                onValueChange={(v) => upd({ mechaniker_zuweisung: v as "Roman" | "Pascal" })}
              >
                <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Roman">Roman</SelectItem>
                  <SelectItem value="Pascal">Pascal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arbeitszeit (h)</Label>
              <Input
                type="number"
                step="0.25"
                value={r.arbeitszeit_stunden ?? ""}
                onChange={(e) => upd({ arbeitszeit_stunden: num(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Auftragswert (CHF)</Label>
            <Input
              type="number"
              step="0.05"
              value={r.auftragswert_chf ?? ""}
              onChange={(e) => upd({ auftragswert_chf: num(e.target.value) })}
            />
          </div>

          <div>
            <Label>Arbeit / Beschreibung</Label>
            <Textarea
              rows={3}
              value={r.arbeit_beschreibung ?? ""}
              onChange={(e) => upd({ arbeit_beschreibung: e.target.value })}
            />
          </div>

          <div>
            <Label>Notizen</Label>
            <Textarea
              rows={2}
              value={r.notizen ?? ""}
              onChange={(e) => upd({ notizen: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Kunde */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Kunde</CardTitle>
          <SaveIndicator state={state} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Kundennummer</Label>
            <Input
              value={r.kundennummer ?? ""}
              onChange={(e) => upd({ kundennummer: e.target.value })}
              className="font-mono"
            />
          </div>
          <div>
            <Label>Name</Label>
            <Input
              value={r.kunde_name ?? ""}
              onChange={(e) => upd({ kunde_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Strasse</Label>
            <Input
              value={r.kunde_strasse ?? ""}
              onChange={(e) => upd({ kunde_strasse: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>PLZ</Label>
              <Input
                value={r.kunde_plz ?? ""}
                onChange={(e) => upd({ kunde_plz: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Ort</Label>
              <Input
                value={r.kunde_ort ?? ""}
                onChange={(e) => upd({ kunde_ort: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefon</Label>
              <Input
                value={r.kunde_telefon ?? ""}
                onChange={(e) => upd({ kunde_telefon: e.target.value })}
              />
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input
                type="email"
                value={r.kunde_email ?? ""}
                onChange={(e) => upd({ kunde_email: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
