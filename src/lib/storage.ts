import { supabase } from "@/integrations/supabase/client";

const STORAGE_PATTERNS = [
  /\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/i,
  /\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(?:\?|$)/i,
];

export function parseStorageUrl(value: string): { bucket: string; path: string } | null {
  for (const pattern of STORAGE_PATTERNS) {
    const m = value.match(pattern);
    if (m) {
      return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
    }
  }

  // New canonical DB format: "bucket/path/to/file.ext"
  if (!/^https?:\/\//i.test(value) && value.includes("/")) {
    const [bucket, ...rest] = value.split("/");
    const path = rest.join("/");
    if (bucket && path) return { bucket, path };
  }

  return null;
}

/**
 * Wandelt eine in der DB gespeicherte Storage-Referenz (URL oder bucket/path)
 * in eine kurzlebige Signed URL um. Private Buckets wie `belege` und `fotos`
 * bleiben so direkt nutzbar.
 */
export async function toSignedUrl(value: string | null, expiresIn = 3600): Promise<string | null> {
  if (!value) return null;
  const target = parseStorageUrl(value);
  if (!target) return value;
  const { data, error } = await supabase.storage
    .from(target.bucket)
    .createSignedUrl(target.path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Lädt den Datei-Inhalt direkt via Storage-Client (RLS-konform).
 */
export async function downloadStorageFile(value: string): Promise<Blob | null> {
  const target = parseStorageUrl(value);
  if (!target) return null;
  const { data, error } = await supabase.storage
    .from(target.bucket)
    .download(target.path);
  if (error || !data) return null;
  return data;
}
