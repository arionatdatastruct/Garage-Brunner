import { supabase } from "@/integrations/supabase/client";

const STORAGE_PATTERNS = [
  /\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/i,
  /\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(?:\?|$)/i,
];

export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  for (const pattern of STORAGE_PATTERNS) {
    const m = url.match(pattern);
    if (m) {
      return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
    }
  }
  return null;
}

/**
 * Wandelt eine in der DB gespeicherte (möglicherweise public) Storage-URL
 * in eine kurzlebige Signed URL um. Wird benötigt, weil die Buckets
 * `belege` und `fotos` privat sind.
 */
export async function toSignedUrl(url: string | null, expiresIn = 3600): Promise<string | null> {
  if (!url) return null;
  const target = parseStorageUrl(url);
  if (!target) return url;
  const { data, error } = await supabase.storage
    .from(target.bucket)
    .createSignedUrl(target.path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Lädt den Datei-Inhalt direkt via Storage-Client (RLS-konform).
 */
export async function downloadStorageFile(url: string): Promise<Blob | null> {
  const target = parseStorageUrl(url);
  if (!target) return null;
  const { data, error } = await supabase.storage
    .from(target.bucket)
    .download(target.path);
  if (error || !data) return null;
  return data;
}
