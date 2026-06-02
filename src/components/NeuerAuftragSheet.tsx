import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, CalendarIcon, FileText, X, ChevronLeft, ChevronRight } from "lucide-react";
import { zeitfensterFuer, istArbeitstag, naechsterWerktag } from "@/lib/arbeitszeiten";
import { format, parseISO, getDay, isBefore, startOfDay, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (info?: { id: string; geplantes_datum: string }) => void;
  defaultDate?: string;
}

const STUNDEN_QUICK = [0.5, 1, 2, 4, 8];

export function NeuerAuftragSheet({ open, onOpenChange, onCreated, defaultDate }: Props) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [datum, setDatum] = useState(defaultDate ?? format(naechsterWerktag(), "yyyy-MM-dd"));
  const [stunden, setStunden] = useState<string>("1");
  const [mechaniker, setMechaniker] = useState<"Roman" | "Pascal" | "">("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDatum(defaultDate ?? format(naechsterWerktag(), "yyyy-MM-dd"));
    }
  }, [open, defaultDate]);

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

      const path = `${rap.id}/${Date.now()}-${pdfFile.name}`;
      const { error: upErr } = await supabase.storage.from("belege").upload(path, pdfFile, {
        contentType: "application/pdf",
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("belege").getPublicUrl(path);

      const { error: updErr } = await (supabase as any)
        .from("arbeitsrapporte")
        .update({ pdf_url: pub.publicUrl })
        .eq("id", rap.id);
      if (updErr) throw updErr;

      try {
        const { data: ocrRes, error: ocrErr } = await supabase.functions.invoke("process-beleg", {
          body: { rapport_id: rap.id, pdf_path: path },
        });
        if (ocrErr) throw ocrErr;
        const warnings: string[] = ocrRes?.warnings ?? [];
        if (warnings.length > 0) {
          toast.warning(`OCR fertig – ${warnings.length} Hinweis(e), bitte prüfen`);
        }
      } catch (whErr) {
        console.warn("OCR Fehler (nicht kritisch):", whErr);
        toast.warning("OCR konnte nicht ausgeführt werden – Felder bitte manuell prüfen");
      }

      toast.success(`Auftrag ${rap.rapport_nummer} angelegt`);
      reset();
      onOpenChange(false);
      onCreated({ id: rap.id, geplantes_datum: datum });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Fehler beim Anlegen");
    } finally {
      setBusy(false);
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrowDate = naechsterWerktag(addDays(new Date(), 1));
  const tomorrow = format(tomorrowDate, "yyyy-MM-dd");
  const inAWeek = format(naechsterWerktag(addDays(new Date(), 7)), "yyyy-MM-dd");

  const canSubmit = !!pdfFile && istArbeitstag(datum) && !busy;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-0 pb-0 max-h-[94vh]">
        <DrawerHeader className="px-4 pt-2 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <DrawerTitle className="text-lg">Neuer Auftrag</DrawerTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Schliessen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 py-4 space-y-5 flex-1">
          {/* PDF Upload */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Beleg (PDF)
            </Label>
            <label
              className={cn(
                "mt-1.5 flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-7 cursor-pointer transition active:scale-[0.99]",
                pdfFile ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/40"
              )}
            >
              {pdfFile ? (
                <>
                  <FileText className="h-7 w-7 text-primary mb-2" />
                  <span className="text-sm font-medium text-foreground text-center px-3 break-all">
                    {pdfFile.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {(pdfFile.size / 1024).toFixed(0)} KB · Tippen zum Ändern
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">PDF auswählen</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Aus Galerie oder Dateien
                  </span>
                </>
              )}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {/* Datum */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Datum
            </Label>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5 mb-2">
              <button
                type="button"
                onClick={() => setDatum(today)}
                disabled={!istArbeitstag(today)}
                className={cn(
                  "h-11 rounded-lg border text-xs font-medium transition active:scale-95",
                  datum === today
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-muted",
                  !istArbeitstag(today) && "opacity-40"
                )}
              >
                Heute
              </button>
              <button
                type="button"
                onClick={() => setDatum(tomorrow)}
                className={cn(
                  "h-11 rounded-lg border text-xs font-medium transition active:scale-95",
                  datum === tomorrow
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-muted"
                )}
              >
                Nächster<br />
                <span className="text-[10px] opacity-80 font-mono">
                  {format(tomorrowDate, "EEE d.M.", { locale: de })}
                </span>
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "h-11 rounded-lg border text-xs font-medium transition active:scale-95 flex items-center justify-center gap-1",
                      datum !== today && datum !== tomorrow
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-muted"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Anderes
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={parseISO(datum)}
                    onSelect={(d) => d && setDatum(format(d, "yyyy-MM-dd"))}
                    disabled={(date) => {
                      const day = getDay(date);
                      if (day === 0 || day === 6) return true;
                      return isBefore(date, startOfDay(new Date()));
                    }}
                    weekStartsOn={1}
                    locale={de}
                    initialFocus
                    className={cn(
                      "p-3 pointer-events-auto",
                      "[&_thead_tr>th:nth-child(6)]:hidden [&_thead_tr>th:nth-child(7)]:hidden",
                      "[&_tbody_tr>td:nth-child(6)]:hidden [&_tbody_tr>td:nth-child(7)]:hidden"
                    )}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>{format(parseISO(datum), "EEEE, d. MMMM yyyy", { locale: de })}</span>
              <span className="font-mono">{zeitfensterFuer(datum)}</span>
            </div>
            {!istArbeitstag(datum) && (
              <div className="mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1.5">
                Sa/So sind keine Arbeitstage — bitte Mo–Fr wählen.
              </div>
            )}
          </div>

          {/* Stunden */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Geplante Dauer
            </Label>
            <div className="flex gap-2 mt-1.5 mb-2">
              <Input
                type="number"
                step="0.25"
                min="0"
                inputMode="decimal"
                value={stunden}
                onChange={(e) => setStunden(e.target.value)}
                className="h-12 text-base font-mono tabular-nums text-right pr-3"
              />
              <div className="flex items-center px-3 rounded-md bg-muted text-sm font-medium text-muted-foreground">
                h
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {STUNDEN_QUICK.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setStunden(String(h))}
                  className={cn(
                    "h-9 rounded-md border text-xs font-mono font-semibold active:scale-95 transition",
                    Number(stunden) === h
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:bg-muted"
                  )}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* Mechaniker */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Mechaniker
            </Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {(["", "Roman", "Pascal"] as const).map((m) => (
                <button
                  key={m || "none"}
                  type="button"
                  onClick={() => setMechaniker(m)}
                  className={cn(
                    "h-12 rounded-lg border text-sm font-medium transition active:scale-95 flex items-center justify-center gap-2",
                    mechaniker === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:bg-muted"
                  )}
                >
                  {m && (
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        m === "Roman" ? "bg-blue-500" : "bg-emerald-500"
                      )}
                    />
                  )}
                  {m || "Offen"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div
          className="border-t border-border bg-card/95 backdrop-blur p-3 flex gap-2"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="h-12 flex-1"
          >
            Abbrechen
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit}
            className="h-12 flex-[2]"
          >
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Auftrag anlegen
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
