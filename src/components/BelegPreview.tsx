import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, FileText, Loader2, TriangleAlert } from "lucide-react";

interface BelegPreviewProps {
  pdfUrl: string | null;
}

const STORAGE_PATTERNS = [
  /\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)$/i,
  /\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(?:\?|$)/i,
];

function getStorageTarget(pdfUrl: string) {
  for (const pattern of STORAGE_PATTERNS) {
    const match = pdfUrl.match(pattern);
    if (match) {
      return {
        bucket: decodeURIComponent(match[1]),
        path: decodeURIComponent(match[2]),
      };
    }
  }

  return null;
}

export function BelegPreview({ pdfUrl }: BelegPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageTarget = useMemo(() => {
    if (!pdfUrl) return null;
    return getStorageTarget(pdfUrl);
  }, [pdfUrl]);

  useEffect(() => {
    let active = true;
    let nextBlobUrl: string | null = null;

    async function loadPdf() {
      if (!pdfUrl) {
        setBlobUrl(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let pdfBlob: Blob | null = null;

        try {
          const response = await fetch(pdfUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          pdfBlob = await response.blob();
        } catch (fetchError) {
          if (!storageTarget) {
            throw fetchError;
          }

          const { data, error: downloadError } = await supabase.storage
            .from(storageTarget.bucket)
            .download(storageTarget.path);

          if (downloadError || !data) {
            throw downloadError ?? fetchError;
          }

          pdfBlob = data;
        }

        if (!active || !pdfBlob) return;

        nextBlobUrl = URL.createObjectURL(
          pdfBlob.type ? pdfBlob : new Blob([pdfBlob], { type: "application/pdf" })
        );
        setBlobUrl(nextBlobUrl);
      } catch (err) {
        if (!active) return;
        setBlobUrl(null);
        setError(
          err instanceof Error
            ? err.message
            : "Der Original-Beleg konnte nicht geladen werden."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      active = false;
      if (nextBlobUrl) {
        URL.revokeObjectURL(nextBlobUrl);
      }
    };
  }, [pdfUrl, storageTarget]);

  const openHref = blobUrl ?? pdfUrl ?? undefined;

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground border border-dashed border-border rounded-md">
        <FileText className="h-8 w-8 mb-2" />
        Kein PDF
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[60vh] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <FileText className="h-3 w-3" /> Original-Beleg
        </span>
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> Neuer Tab
        </a>
      </div>

      {loading ? (
        <div className="flex flex-1 min-h-[55vh] items-center justify-center rounded-md border border-border bg-muted text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Beleg wird geladen…
        </div>
      ) : blobUrl ? (
        <iframe
          src={`${blobUrl}#toolbar=1&view=FitH`}
          title="Beleg PDF"
          className="w-full flex-1 min-h-[55vh] rounded-md border border-border bg-muted"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 min-h-[40vh] text-muted-foreground border border-dashed border-border rounded-md px-6 text-center">
          <TriangleAlert className="h-8 w-8 text-amber-500" />
          <p className="text-sm">Der Beleg konnte im Browser nicht direkt angezeigt werden.</p>
          <p className="text-xs">Bitte öffne ihn im neuen Tab. Falls ein Werbeblocker aktiv ist, erlaube Supabase-Dateien.</p>
          {error && <p className="text-[11px] text-muted-foreground/80 break-all">{error}</p>}
        </div>
      )}
    </div>
  );
}