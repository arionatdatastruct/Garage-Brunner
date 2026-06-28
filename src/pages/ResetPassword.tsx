import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import logo from "@/assets/garage-brunner-logo.svg";

/**
 * Passwort-Reset-Zielseite.
 *
 * Zugriffsschutz: Die Seite ist nur erreichbar, wenn die URL einen gültigen
 * Recovery-Token enthält (entweder `?code=...` PKCE oder
 * `#access_token=...&type=recovery` Implicit-Flow). Ohne Token sehen Besucher
 * eine 403-artige Fehlermeldung — kein Formular wird gerendert.
 *
 * Die Seite ist absichtlich NICHT in der App-Navigation verlinkt und wird
 * ausschließlich über den Recovery-Link aus Supabase erreicht.
 */

type AccessState = "checking" | "denied" | "ready" | "exchanging";

const hasRecoveryHash = (hash: string) => {
  if (!hash || hash.length < 2) return false;
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const type = params.get("type");
  const access = params.get("access_token");
  return type === "recovery" && !!access;
};

const getSupabaseErrorFromHash = (hash: string) => {
  if (!hash || hash.length < 2) return null;
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return params.get("error") || params.get("error_code");
};

export default function ResetPassword() {
  const [access, setAccess] = useState<AccessState>("checking");
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const errorParam =
      url.searchParams.get("error") ||
      url.searchParams.get("error_code") ||
      getSupabaseErrorFromHash(window.location.hash);
    const recoveryInHash = hasRecoveryHash(window.location.hash);

    if (errorParam) {
      setAccess("denied");
      return;
    }

    // Harte Token-Gate: ohne Code/Hash gar nicht erst weitermachen.
    if (!code && !recoveryInHash) {
      setAccess("denied");
      return;
    }

    const init = async () => {
      try {
        if (code) {
          setAccess("exchanging");
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            window.location.href,
          );
          if (exchangeError) {
            if (mounted) setAccess("denied");
            return;
          }
          // URL aufräumen, damit der Token nicht in der History bleibt.
          window.history.replaceState({}, "", window.location.pathname);
        }

        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        if (data.session) {
          setHasSession(true);
          setAccess("ready");
        } else {
          // Implicit-Flow (Hash-Token) wird asynchron vom Supabase-Client
          // verarbeitet — warten auf das PASSWORD_RECOVERY-Event unten.
          setAccess("checking");
        }
      } catch {
        if (mounted) setAccess("denied");
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        // Hash aus URL entfernen, sobald Supabase ihn verarbeitet hat.
        if (window.location.hash) {
          window.history.replaceState({}, "", window.location.pathname);
        }
        setHasSession(true);
        setAccess("ready");
      }
    });

    // Safety-Net: wenn nach 6s keine Session entstanden ist, ablehnen.
    const timeout = window.setTimeout(() => {
      if (mounted) {
        setAccess((current) => (current === "ready" ? current : "denied"));
      }
    }, 6000);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasSession) {
      setError("Kein gültiger Reset-Token. Bitte neuen Link anfordern.");
      return;
    }
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Passwort konnte nicht geändert werden.");
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => {
      window.location.href = "/";
    }, 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-xs space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg">
        <img src={logo} alt="" className="h-8 w-auto mx-auto select-none" draggable={false} />

        <h1 className="text-sm font-medium text-center">Neues Passwort festlegen</h1>

        {(access === "checking" || access === "exchanging") && (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {access === "denied" && !success && (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <p className="text-xs font-medium">Zugriff verweigert</p>
            <p className="text-xs text-muted-foreground">
              Diese Seite ist nur über einen gültigen Passwort-Reset-Link erreichbar.
              Bitte einen neuen Link beim Administrator anfordern.
            </p>
          </div>
        )}

        {access === "ready" && !success && (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs">Neues Passwort</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-xs">Passwort bestätigen</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Passwort speichern"}
            </Button>
          </form>
        )}

        {success && (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <p className="text-xs text-muted-foreground">
              Passwort geändert. Du wirst zur Anmeldung weitergeleitet…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
