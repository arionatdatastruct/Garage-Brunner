import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

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

export function AuftragForm({ rapport, kunde, onSaved }: Props) {
  const [r, setR] = useState(rapport);
  const [k, setK] = useState<Kunde | null>(kunde);
  const [busyR, setBusyR] = useState(false);
  const [busyK, setBusyK] = useState(false);

  useEffect(() => setR(rapport), [rapport]);
  useEffect(() => setK(kunde), [kunde]);

  const saveRapport = async () => {
    setBusyR(true);
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
      toast.success("Auftrag gespeichert");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Fehler");
    } finally {
      setBusyR(false);
    }
  };

  const saveKunde = async () => {
    if (!k) return;
    setBusyK(true);
    try {
      const { error } = await (supabase as any)
        .from("kunden")
        .update({ name: k.name, ort: k.ort, telefon: k.telefon, email: k.email })
        .eq("id", k.id);
      if (error) throw error;
      toast.success("Kunde gespeichert");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Fehler");
    } finally {
      setBusyK(false);
    }
  };

  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auftrag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategorie</Label>
              <Select
                value={r.kategorie ?? ""}
                onValueChange={(v) => setR({ ...r, kategorie: v })}
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
                onValueChange={(v) => setR({ ...r, mechaniker_zuweisung: v as "Roman" | "Pascal" })}
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
                onChange={(e) => setR({ ...r, km_stand: num(e.target.value) })}
              />
            </div>
            <div>
              <Label>Arbeitszeit (h)</Label>
              <Input
                type="number"
                step="0.25"
                value={r.arbeitszeit_stunden ?? ""}
                onChange={(e) => setR({ ...r, arbeitszeit_stunden: num(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Auftragswert (CHF)</Label>
            <Input
              type="number"
              step="0.05"
              value={r.auftragswert_chf ?? ""}
              onChange={(e) => setR({ ...r, auftragswert_chf: num(e.target.value) })}
            />
          </div>

          <div>
            <Label>Arbeit / Beschreibung</Label>
            <Textarea
              rows={3}
              value={r.arbeit_beschreibung ?? ""}
              onChange={(e) => setR({ ...r, arbeit_beschreibung: e.target.value })}
            />
          </div>

          <div>
            <Label>Notizen</Label>
            <Textarea
              rows={2}
              value={r.notizen ?? ""}
              onChange={(e) => setR({ ...r, notizen: e.target.value })}
            />
          </div>

          <Button onClick={saveRapport} disabled={busyR} className="w-full">
            {busyR ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Auftrag speichern
          </Button>
        </CardContent>
      </Card>

      {k && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kunde</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={k.name ?? ""} onChange={(e) => setK({ ...k, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ort</Label>
                <Input value={k.ort ?? ""} onChange={(e) => setK({ ...k, ort: e.target.value })} />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={k.telefon ?? ""} onChange={(e) => setK({ ...k, telefon: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input
                type="email"
                value={k.email ?? ""}
                onChange={(e) => setK({ ...k, email: e.target.value })}
              />
            </div>
            <Button onClick={saveKunde} disabled={busyK} variant="outline" className="w-full">
              {busyK ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kunde speichern
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
