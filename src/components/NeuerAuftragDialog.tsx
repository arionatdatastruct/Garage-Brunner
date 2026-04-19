import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, CalendarIcon } from "lucide-react";
import { WochenAuslastung } from "@/components/WochenAuslastung";
import { zeitfensterFuer, istArbeitstag, naechsterWerktag } from "@/lib/arbeitszeiten";
import { format, parseISO, getDay, isBefore, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultDate?: string;
}

export function NeuerAuftragDialog({ open, onOpenChange, onCreated, defaultDate }: Props) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [datum, setDatum] = useState(defaultDate ?? format(naechsterWerktag(), "yyyy-MM-dd"));
  const [stunden, setStunden] = useState<string>("1");
  const [mechaniker, setMechaniker] = useState<"Roman" | "Pascal" | "">("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPdfFile(null);
    setMechaniker("");
    setStunden("1");
  };

  const submit = async () => {
    if (!pdfFile) {
      toast.error("Bitte PDF auswählen");
      return;
    }
    if (!istArbeitstag(datum)) {
      toast.error("Aufträge können nur Mo–Fr geplant werden");
      return;
    }
    setBusy(true);
    try {
      // 1. Rapport anlegen (flach — alle Snapshot-Felder erstmal leer, KI füllt nach)
      const stundenNum = stunden ? Number(stunden) : null;
      const { data: rap, error: rapErr } = await (supabase as any)
        .from("arbeitsrapporte")
        .insert({
          status: "geplant",
          geplantes_datum: datum,
          mechaniker_zuweisung: mechaniker || null,
          arbeitszeit_stunden: stundenNum,
        })
        .select()
        .single();
      if (rapErr) throw rapErr;

      // 2. PDF in belege-Bucket (Pfad mit rapport.id)
      const path = `${rap.id}/${Date.now()}-${pdfFile.name}`;
      const { error: upErr } = await supabase.storage.from("belege").upload(path, pdfFile, {
        contentType: "application/pdf",
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("belege").getPublicUrl(path);

      // 3. pdf_url nachtragen
      const { error: updErr } = await (supabase as any)
        .from("arbeitsrapporte")
        .update({ pdf_url: pub.publicUrl })
        .eq("id", rap.id);
      if (updErr) throw updErr;

      // 4. n8n Webhook (KI extrahiert alle Felder direkt in arbeitsrapporte)
      try {
        await supabase.functions.invoke("notify-n8n", {
          body: {
            rapport_id: rap.id,
            pdf_url: pub.publicUrl,
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !datum && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {datum
                      ? format(parseISO(datum), "EEE, d. MMM yyyy", { locale: de })
                      : "Datum wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={datum ? parseISO(datum) : undefined}
                    onSelect={(d) => d && setDatum(format(d, "yyyy-MM-dd"))}
                    disabled={(date) => {
                      const day = getDay(date);
                      return day === 0 || day === 6;
                    }}
                    weekStartsOn={1}
                    locale={de}
                    initialFocus
                    className={cn(
                      "p-3 pointer-events-auto",
                      // Sa/So-Spalten komplett ausblenden (Header + Zellen)
                      "[&_table]:border-separate",
                      "[&_thead_tr>th:nth-child(6)]:hidden [&_thead_tr>th:nth-child(7)]:hidden",
                      "[&_tbody_tr>td:nth-child(6)]:hidden [&_tbody_tr>td:nth-child(7)]:hidden"
                    )}
                  />
                </PopoverContent>
              </Popover>
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
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1.5">
              Sa/So sind keine Arbeitstage — bitte Mo–Fr wählen.
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={busy || !pdfFile || !istArbeitstag(datum)}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
