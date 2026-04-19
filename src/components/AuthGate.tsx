import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Stellt sicher, dass jeder Browser eine gültige Supabase-Session hat
 * (anonym, da die App via Cloudflare Access geschützt ist und keine Login-Seite hat).
 * Damit greifen die RLS-Policies "TO authenticated".
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const ensureSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const { error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
        }
        if (mounted) setReady(true);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Auth-Fehler");
      }
    };

    ensureSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && mounted) setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-destructive font-medium">Authentifizierung fehlgeschlagen</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">
            Bitte in Supabase unter Auth → Providers die Option "Anonymous Sign-Ins" aktivieren.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
