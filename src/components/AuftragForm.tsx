import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

interface Rapport {
  id: string;
  kategorie: string | null;
  km_stand: number | null;
  arbeit_beschreibung: string | null;
  arbeitszeit_stunden: number | null;
  mechaniker_zuweisung: "Roman" | "Pascal" | null;
  auftragswert_chf: number | null;
  notizen: string | null;
}

interface Kunde {
  id: string;
  name: string;
  ort: string | null;
  telefon: string | null;
  email: string | null;
}

interface Props {
  rapport: Rapport;
  kunde: Kunde | null;
  onSaved: () => void;
}

const KATEGORIEN = ["Service", "Reparatur", "MFK", "Reifen", "Sonstiges"];
type SaveState = "idle" | "saving" | "saved";

export function AuftragForm({ rapport, kunde, onSaved }: Props) {
  const [r, setR] = useState(rapport);
  const [k, setK] = useState<Kunde | null>(kunde);
  const [rState, setRState] = useState<SaveState>("idle");
  const [kState, setKState] = useState<SaveState>("idle");

  const rTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rDirty = useRef(false);
  const kDirty = useRef(false);

  useEffect(() => {
    setR(rapport);
    rDirty.current = false;
  }, [rapport]);
  useEffect(() => {
    setK(kunde);
    kDirty.current = false;
  }, [kunde]);

  // Auto-save Rapport
  useEffect(() => {
    if (!rDirty.current) return;
    if (rTimer.current) clearTimeout(rTimer.current);
    setRState("saving");
    rTimer.current = setTimeout(async () => {
      try {
        const { error } = await (supabase as any)
          .from("arbeitsrapporte")
          .update({
            kategorie: r.kategorie,
            km_stand: r.km_stand,
            arbeit_beschreibung: r.arbeit_beschreibung,
            arbeitszeit_stunden: r.arbeitszeit_stunden,
            mechaniker_zuweisung: r.mechaniker_zuweisung,
            auftragswert_chf: r.auftragswert_chf,
            notizen: r.notizen,
          })
          .eq("id", r.id);
        if (error) throw error;
        setRState("saved");
        onSaved();
        setTimeout(() => setRState("idle"), 1500);
      } catch (e: any) {
        setRState("idle");
        toast.error(e.message ?? "Fehler beim Speichern");
      }
    }, 700);
    return () => {
      if (rTimer.current) clearTimeout(rTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);

  // Auto-save Kunde
  useEffect(() => {
    if (!kDirty.current || !k) return;
    if (kTimer.current) clearTimeout(kTimer.current);
    setKState("saving");
    kTimer.current = setTimeout(async () => {
      try {
        const { error } = await (supabase as any)
          .from("kunden")
          .update({ name: k.name, ort: k.ort, telefon: k.telefon, email: k.email })
          .eq("id", k.id);
        if (error) throw error;
        setKState("saved");
        onSaved();
        setTimeout(() => setKState("idle"), 1500);
      } catch (e: any) {
        setKState("idle");
        toast.error(e.message ?? "Fehler beim Speichern");
      }
    }, 700);
    return () => {
      if (kTimer.current) clearTimeout(kTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);

  const updR = (patch: Partial<Rapport>) => {
    rDirty.current = true;
    setR((prev) => ({ ...prev, ...patch }));
  };
  const updK = (patch: Partial<Kunde>) => {
    if (!k) return;
    kDirty.current = true;
    setK({ ...k, ...patch });
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
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Auftrag</CardTitle>
          <SaveIndicator state={rState} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategorie</Label>
              <Select
                value={r.kategorie ?? ""}
                onValueChange={(v) => updR({ kategorie: v })}
              >
                <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>
                  {KATEGORIEN.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mechaniker</Label>
              <Select
                value={r.mechaniker_zuweisung ?? ""}
                onValueChange={(v) => updR({ mechaniker_zuweisung: v as "Roman" | "Pascal" })}
              >
                <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Roman">Roman</SelectItem>
                  <SelectItem value="Pascal">Pascal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>KM-Stand</Label>
              <Input
                type="number"
                value={r.km_stand ?? ""}
                onChange={(e) => updR({ km_stand: num(e.target.value) })}
              />
            </div>
            <div>
              <Label>Arbeitszeit (h)</Label>
              <Input
                type="number"
                step="0.25"
                value={r.arbeitszeit_stunden ?? ""}
                onChange={(e) => updR({ arbeitszeit_stunden: num(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Auftragswert (CHF)</Label>
            <Input
              type="number"
              step="0.05"
              value={r.auftragswert_chf ?? ""}
              onChange={(e) => updR({ auftragswert_chf: num(e.target.value) })}
            />
          </div>

          <div>
            <Label>Arbeit / Beschreibung</Label>
            <Textarea
              rows={3}
              value={r.arbeit_beschreibung ?? ""}
              onChange={(e) => updR({ arbeit_beschreibung: e.target.value })}
            />
          </div>

          <div>
            <Label>Notizen</Label>
            <Textarea
              rows={2}
              value={r.notizen ?? ""}
              onChange={(e) => updR({ notizen: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {k && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Kunde</CardTitle>
            <SaveIndicator state={kState} />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={k.name ?? ""} onChange={(e) => updK({ name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ort</Label>
                <Input value={k.ort ?? ""} onChange={(e) => updK({ ort: e.target.value })} />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={k.telefon ?? ""} onChange={(e) => updK({ telefon: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input
                type="email"
                value={k.email ?? ""}
                onChange={(e) => updK({ email: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
