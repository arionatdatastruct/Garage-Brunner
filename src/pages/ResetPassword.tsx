import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import logo from "@/assets/garage-brunner-logo.svg";

/**
 * Passwort-Reset-Zielseite.
 *
 * Diese Seite ist absichtlich NICHT in der App-Navigation verlinkt.
 * Sie wird ausschließlich über den Recovery-Link aus Supabase erreicht,
 * z. B. wenn ein Admin im Supabase-Dashboard ein Passwort zurücksetzt
 * und als Redirect-URL `<origin>/reset-password` hinterlegt ist.
 *
 * Ablauf:
 *  1. Supabase hängt entweder `?code=...` (PKCE) oder
 *     `#access_token=...&refresh_token=...&type=recovery` an die URL.
 *  2. Der Supabase-Client tauscht das automatisch in eine Session
 *     (detectSessionInUrl ist standardmäßig aktiv).
 *  3. Wir warten kurz auf die Session und erlauben dann
 *     `updateUser({ password })`.
 */
export default function ResetPassword() {
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Falls PKCE-Code in der URL ist, explizit einlösen (manche Browser/SPAs brauchen das).
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    const init = async () => {
      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(window.location.href);
          // URL aufräumen, damit der Token nicht im History bleibt.
          window.history.replaceState({}, "", window.location.pathname);
        }
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setHasRecoverySession(!!data.session);
      } finally {
        if (mounted) setChecking(false);
      }
    };

    init();

    // Supabase feuert nach dem Hash-Parsing ein PASSWORD_RECOVERY-Event.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(!!session || event === "PASSWORD_RECOVERY");
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message || "Passwort konnte nicht geändert werden.");
      return;
    }

    setSuccess(true);
    // Recovery-Session beenden, damit der nächste Login frisch erfolgt.
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

        {checking && (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!checking && !hasRecoverySession && !success && (
          <p className="text-xs text-destructive text-center">
            Dieser Link ist ungültig oder abgelaufen. Bitte einen neuen Reset-Link anfordern.
          </p>
        )}

        {!checking && hasRecoverySession && !success && (
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
