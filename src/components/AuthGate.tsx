import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import Login from "@/pages/Login";

/**
 * Schützt die App: ohne gültige Supabase-Session wird das Login-Formular gezeigt.
 * Sessions werden 30 Tage gehalten (Supabase Default), Refresh-Tokens automatisch erneuert.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    const isValidSession = (session: { access_token?: string; user?: { is_anonymous?: boolean } } | null) =>
      !!session?.access_token && session.user?.is_anonymous !== true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      // Alte anonyme Sessions hart abmelden – diese hatten vor dem Auth-Umbau Vollzugriff.
      if (data.session && data.session.user?.is_anonymous) {
        await supabase.auth.signOut();
        setHasSession(false);
      } else {
        setHasSession(isValidSession(data.session));
      }
      setChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setHasSession(isValidSession(session));
      setChecked(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!hasSession) {
    return <Login />;
  }

  return <>{children}</>;
}
