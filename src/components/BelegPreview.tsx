import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, ExternalLink, FileText, Loader2, TriangleAlert } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
// Lokaler Worker via Vite — kein CDN, keine Network-Blockaden in Sandbox/Prod.
// `?url` gibt die gebundelte Asset-URL zurück, die mit der pdfjs-Version übereinstimmt.
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

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

// iOS Safari: pdf.js ist instabil → direkt iframe (nativer PDF-Viewer)
const isIosSafari = (() => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(ad|hone|od)/.test(ua) && /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
})();

type RenderMode = "pdfjs" | "iframe";

export function BelegPreview({ pdfUrl }: BelegPreviewProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("beleg.pdf");
  const [pageCount, setPageCount] = useState(0);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<RenderMode>(isIosSafari ? "iframe" : "pdfjs");

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
        setDataUrl(null);
        setError(null);
        setPageCount(0);
        return;
      }

      setLoading(true);
      setError(null);
      setPageCount(0);

      try {
        let pdfBlob: Blob | null = null;
        let derivedName = "beleg.pdf";
        if (storageTarget) {
          const { data, error: downloadError } = await supabase.storage
            .from(storageTarget.bucket)
            .download(storageTarget.path);
          if (downloadError || !data) {
            throw downloadError ?? new Error("Beleg konnte nicht geladen werden");
          }
          pdfBlob = data;
          const segs = storageTarget.path.split("/");
          derivedName = segs[segs.length - 1] || derivedName;
        } else {
          const response = await fetch(pdfUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          pdfBlob = await response.blob();
        }

        if (!active || !pdfBlob) return;

        const headerBuffer = await pdfBlob.slice(0, 4).arrayBuffer();
        const header = new TextDecoder().decode(headerBuffer);
        if (header !== "%PDF") throw new Error("Datei ist kein gültiges PDF");

        const normalizedBlob = pdfBlob.type === "application/pdf"
          ? pdfBlob
          : new Blob([pdfBlob], { type: "application/pdf" });
        const arrayBuffer = await normalizedBlob.arrayBuffer();
        if (!active) return;

        nextBlobUrl = URL.createObjectURL(normalizedBlob);

        // data: URL als Fallback — Edge/Chrome blockieren teils blob: in iframes
        // wenn der Tab in einem fremden Origin (Sandbox/Lovable Preview) läuft.
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(i, i + CHUNK)) as unknown as number[]
          );
        }
        const base64 = btoa(binary);
        const nextDataUrl = `data:application/pdf;base64,${base64}`;

        setPdfData(bytes);
        setBlobUrl(nextBlobUrl);
        setDataUrl(nextDataUrl);
        setFileName(derivedName);
      } catch (err) {
        if (!active) return;
        setPdfData(null);
        setBlobUrl(null);
        setDataUrl(null);
        setError(
          err instanceof Error
            ? err.message
            : "Der Original-Beleg konnte nicht geladen werden."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPdf();
    return () => {
      active = false;
      if (nextBlobUrl) URL.revokeObjectURL(nextBlobUrl);
    };
  }, [pdfUrl, storageTarget]);

  const openHref = blobUrl ?? dataUrl ?? undefined;
  const iframeSrc = dataUrl ?? blobUrl ?? undefined;

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
        <div className="flex items-center gap-3">
          {mode === "pdfjs" && blobUrl && (
            <button
              type="button"
              onClick={() => setMode("iframe")}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              title="Falls die Vorschau leer bleibt"
            >
              Browser-Viewer
            </button>
          )}
          {openHref && (
            <a
              href={openHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Neuer Tab
            </a>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[55vh] flex-1 items-center justify-center gap-2 rounded-md border border-border bg-muted text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Beleg wird geladen…
        </div>
      ) : !blobUrl ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-6 text-center text-muted-foreground">
          <TriangleAlert className="h-8 w-8 text-destructive" />
          <p className="text-sm">Der Beleg konnte nicht geladen werden.</p>
          {error && <p className="break-all text-[11px] text-muted-foreground/80">{error}</p>}
        </div>
      ) : mode === "iframe" ? (
        <iframe
          src={blobUrl}
          title="Original-Beleg"
          className="flex-1 min-h-[70vh] w-full rounded-md border border-border bg-background"
        />
      ) : documentFile ? (
        <div
          ref={previewRef}
          className="flex-1 min-h-[70vh] overflow-y-auto rounded-md border border-border bg-muted/30 p-1"
        >
          <Document
            file={documentFile}
            loading={null}
            error={
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted px-6 text-center text-muted-foreground">
                <TriangleAlert className="h-8 w-8 text-destructive" />
                <p className="text-sm">Die PDF konnte nicht gerendert werden.</p>
                <button
                  type="button"
                  onClick={() => setMode("iframe")}
                  className="text-xs text-primary hover:underline"
                >
                  Mit Browser-Viewer öffnen
                </button>
              </div>
            }
            onLoadError={() => setMode("iframe")}
            onSourceError={() => setMode("iframe")}
            onLoadSuccess={({ numPages }) => setPageCount(numPages)}
          >
            <div className="flex flex-col items-center gap-3">
              {Array.from({ length: pageCount }, (_, index) => (
                <div
                  key={index + 1}
                  className="overflow-hidden rounded-md border border-border bg-background shadow-sm w-full"
                >
                  <Page
                    pageNumber={index + 1}
                    width={Math.max(previewWidth - 8, 280)}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                </div>
              ))}
            </div>
          </Document>
        </div>
      ) : null}
    </div>
  );
}
