import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";

interface Props {
  rapportId: string;
  currentFotos: string[] | null | undefined;
  onUploaded: () => void;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function FotoHinzufuegen({ rapportId, currentFotos, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const fotos = [...(currentFotos ?? [])];
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        const blob = dataUrlToBlob(compressed.dataUrl);
        const path = `${rapportId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
        const storagePath = `fotos/${path}`;
        const { error: upErr } = await supabase.storage
          .from("fotos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        fotos.push(storagePath);
      }
      const { error: updErr } = await (supabase as any)
        .from("arbeitsrapporte")
        .update({ fotos })
        .eq("id", rapportId);
      if (updErr) throw updErr;
      toast.success(`${files.length} Foto${files.length > 1 ? "s" : ""} hinzugefügt`);
      onUploaded();
    } catch (e: any) {
      toast.error(e.message ?? "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full h-14 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition shadow-md"
      >
        {busy ? (
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        ) : (
          <Camera className="h-5 w-5 mr-2" />
        )}
        Foto hinzufügen
      </Button>
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
