import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

interface Props {
  rapportId: string;
  /** Vorhandene Foto-URLs (aus arbeitsrapporte.fotos) */
  fotos?: string[] | null;
  onUploaded?: () => void;
  variant?: "icon" | "fab";
  className?: string;
}

/**
 * Schneller Foto-Knopf: öffnet Kamera (capture="environment") und lädt
 * ein komprimiertes Foto in den `fotos`-Bucket + hängt URL an
 * `arbeitsrapporte.fotos[]` an.
 */
export function FotoQuickAdd({ rapportId, fotos, onUploaded, variant = "icon", className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        // dataUrl -> Blob
        const res = await fetch(compressed.dataUrl);
        const blob = await res.blob();
        const path = `${rapportId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("fotos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("fotos").getPublicUrl(path);
        newUrls.push(pub.publicUrl);
      }
      const next = [...(fotos ?? []), ...newUrls];
      const { error } = await (supabase as any)
        .from("arbeitsrapporte")
        .update({ fotos: next })
        .eq("id", rapportId);
      if (error) throw error;
      toast.success(`${newUrls.length} Foto${newUrls.length > 1 ? "s" : ""} hinzugefügt`);
      onUploaded?.();
    } catch (e: any) {
      toast.error(e.message ?? "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const trigger = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    inputRef.current?.click();
  };

  if (variant === "fab") {
    return (
      <>
        <button
          type="button"
          onClick={trigger}
          disabled={busy}
          aria-label="Foto aufnehmen"
          className={cn(
            "h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg",
            "flex items-center justify-center active:scale-95 transition disabled:opacity-60",
            className
          )}
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={trigger}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={busy}
        aria-label="Foto aufnehmen"
        className={cn(
          "h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition",
          className
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </>
  );
}
