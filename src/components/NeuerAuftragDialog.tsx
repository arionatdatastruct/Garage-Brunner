import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { WochenAuslastung } from "@/components/WochenAuslastung";
import { zeitfensterFuer, istArbeitstag } from "@/lib/arbeitszeiten";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultDate?: string;
}

export function NeuerAuftragDialog({ open, onOpenChange, onCreated, defaultDate }: Props) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [datum, setDatum] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [stunden, setStunden] = useState<string>("1");
  const [mechaniker, setMechaniker] = useState<"Roman" | "Pascal" | "">("");
  const [kennzeichen, setKennzeichen] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPdfFile(null);
    setKennzeichen("");
    setMechaniker("");
    setStunden("1");
  };

  const submit = async () => {
    if (!pdfFile) {
      toast.error("Bitte PDF auswählen");
      return;
    }
    setBusy(true);
    try {
      // 1a. Kunde-Platzhalter anlegen (KI füllt name/ort später nach)
      const { data: ku, error: kuErr } = await (supabase as any)
        .from("kunden")
        .insert({ name: "(wird ergänzt)" })
        .select()
        .single();
      if (kuErr) throw kuErr;

      // 1b. Fahrzeug anlegen (Platzhalter, KI füllt später nach)
      const platzhalterKennzeichen = kennzeichen.trim() || `TMP-${Date.now().toString().slice(-6)}`;
      const { data: fz, error: fzErr } = await (supabase as any)
        .from("fahrzeuge")
        .insert({ kennzeichen: platzhalterKennzeichen, kunde_id: ku.id })
        .select()
        .single();
      if (fzErr) throw fzErr;

      // 2. PDF in belege-Bucket
      const path = `${fz.id}/${Date.now()}-${pdfFile.name}`;
      const { error: upErr } = await supabase.storage.from("belege").upload(path, pdfFile, {
        contentType: "application/pdf",
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("belege").getPublicUrl(path);

      // 3. Rapport anlegen
      const stundenNum = stunden ? Number(stunden) : null;
      const { data: rap, error: rapErr } = await (supabase as any)
        .from("arbeitsrapporte")
        .insert({
          fahrzeug_id: fz.id,
          status: "geplant",
          geplantes_datum: datum,
          mechaniker_zuweisung: mechaniker || null,
          arbeitszeit_stunden: stundenNum,
          pdf_url: pub.publicUrl,
        })
        .select()
        .single();
      if (rapErr) throw rapErr;

      // 4. n8n Webhook (KI extrahiert auftragsnummer & co)
      try {
        await supabase.functions.invoke("notify-n8n", {
          body: {
            rapport_id: rap.id,
            fahrzeug_id: fz.id,
            kunde_id: ku.id,
            pdf_url: pub.publicUrl,
            kennzeichen: platzhalterKennzeichen,
          },
        });
      } catch (whErr) {
        console.warn("Webhook Fehler (nicht kritisch):", whErr);
      }

      toast.success(`Auftrag ${rap.rapport_nummer} angelegt`);
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Fehler beim Anlegen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Auftrag</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Beleg (PDF)</Label>
            <label className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-md py-6 cursor-pointer hover:bg-muted/50 transition">
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {pdfFile ? pdfFile.name : "PDF auswählen oder hier ablegen"}
              </span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Datum</Label>
              <Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
              <div className="text-[11px] text-muted-foreground mt-1">
                {zeitfensterFuer(datum)}
              </div>
            </div>
            <div>
              <Label>Geplante Dauer (h)</Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                value={stunden}
                onChange={(e) => setStunden(e.target.value)}
              />
            </div>
          </div>

          {!istArbeitstag(datum) && (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1.5">
              Achtung: gewählter Tag ist kein Arbeitstag (Sa/So).
            </div>
          )}

          <WochenAuslastung
            selectedDate={datum}
            zusatzStunden={Number(stunden) || 0}
          />

          <div>
            <Label>Mechaniker</Label>
            <Select value={mechaniker} onValueChange={(v) => setMechaniker(v as any)}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Roman">Roman</SelectItem>
                <SelectItem value="Pascal">Pascal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Kennzeichen (optional)</Label>
            <Input
              value={kennzeichen}
              onChange={(e) => setKennzeichen(e.target.value.toUpperCase())}
              placeholder="Wird sonst von KI ergänzt"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={busy || !pdfFile}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
