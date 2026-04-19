import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, FileText, Loader2, TriangleAlert } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

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
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageTarget = useMemo(() => {
    if (!pdfUrl) return null;
    return getStorageTarget(pdfUrl);
  }, [pdfUrl]);

  const documentFile = useMemo(() => {
    if (!pdfData) return null;
    return { data: pdfData };
  }, [pdfData]);

  useEffect(() => {
    const element = previewRef.current;
    if (!element || !pdfData) return;

    const updateWidth = () => setPreviewWidth(element.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, [pdfData]);

  useEffect(() => {
    let active = true;
    let nextBlobUrl: string | null = null;

    async function loadPdf() {
      if (!pdfUrl) {
        setPdfData(null);
        setBlobUrl(null);
        setError(null);
        setPageCount(0);
        return;
      }

      setLoading(true);
      setError(null);
      setPageCount(0);

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

        const normalizedBlob = pdfBlob.type
          ? pdfBlob
          : new Blob([pdfBlob], { type: "application/pdf" });
        const arrayBuffer = await normalizedBlob.arrayBuffer();
        if (!active) return;

        nextBlobUrl = URL.createObjectURL(normalizedBlob);
        setPdfData(new Uint8Array(arrayBuffer));
        setBlobUrl(nextBlobUrl);
      } catch (err) {
        if (!active) return;
        setPdfData(null);
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
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
        <FileText className="mb-2 h-8 w-8" />
        Kein PDF
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" /> Original-Beleg
        </span>
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Neuer Tab
        </a>
      </div>

      {loading ? (
        <div className="flex min-h-[55vh] flex-1 items-center justify-center gap-2 rounded-md border border-border bg-muted text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Beleg wird geladen…
        </div>
      ) : documentFile ? (
        <div
          ref={previewRef}
          className="flex-1 min-h-[55vh] overflow-y-auto rounded-md border border-border bg-muted/30 p-3"
        >
          <Document
            file={documentFile}
            loading={null}
            error={
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted px-6 text-center text-muted-foreground">
                <TriangleAlert className="h-8 w-8 text-destructive" />
                <p className="text-sm">Die PDF konnte nicht gerendert werden.</p>
                <p className="text-xs">Bitte öffne den Beleg im neuen Tab.</p>
              </div>
            }
            onLoadSuccess={({ numPages }) => setPageCount(numPages)}
          >
            <div className="flex flex-col items-center gap-4">
              {Array.from({ length: pageCount }, (_, index) => (
                <div
                  key={index + 1}
                  className="overflow-hidden rounded-md border border-border bg-background shadow-sm"
                >
                  <Page
                    pageNumber={index + 1}
                    width={Math.max(Math.min(previewWidth - 24, 900), 280)}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                </div>
              ))}
            </div>
          </Document>
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-6 text-center text-muted-foreground">
          <TriangleAlert className="h-8 w-8 text-destructive" />
          <p className="text-sm">Der Beleg konnte im Browser nicht direkt angezeigt werden.</p>
          <p className="text-xs">Bitte öffne ihn im neuen Tab. Falls ein Werbeblocker aktiv ist, erlaube Supabase-Dateien.</p>
          {error && <p className="break-all text-[11px] text-muted-foreground/80">{error}</p>}
        </div>
      )}
    </div>
  );
}
