import { createRoot } from "react-dom/client";
import "./index.css";

// Safety-Net: Wenn ein Supabase-Recovery-Token an irgendeiner anderen Route
// (z.B. "/") ankommt — etwa weil beim Senden des Reset-Mails ein falsches
// redirect_to gesetzt war — sofort auf /reset-password umleiten, BEVOR der
// Supabase-Client den Hash/Code verarbeitet und uns einloggt.
const redirectedToPasswordReset = (() => {
  const pathname = window.location.pathname;
  if (pathname === "/reset-password") return false;
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const searchParams = new URLSearchParams(search);
  const isRecoveryHash =
    hashParams.get("type") === "recovery" && !!hashParams.get("access_token");
  const isRecoveryCode =
    !!searchParams.get("code") &&
    (searchParams.get("type") === "recovery" || hashParams.get("type") === "recovery");
  // PKCE-Code ohne expliziten type kann auch Recovery sein — sicherheitshalber mitnehmen,
  // wenn der Code-Parameter alleine vorkommt und kein User eingeloggt ist.
  const hasBareCode = !!searchParams.get("code") && !searchParams.get("state");
  if (isRecoveryHash || isRecoveryCode || hasBareCode) {
    window.location.replace(`/reset-password${search}${hash}`);
    return true;
  }
  return false;
})();

if (!redirectedToPasswordReset) {
  import("./App.tsx").then(({ default: App }) => {
    createRoot(document.getElementById("root")!).render(<App />);
  });
}

// PWA: Service Worker NUR in Production und niemals im Iframe / Lovable-Preview registrieren.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host.includes("lovable.app") ||
  host === "localhost" ||
  host === "127.0.0.1";

if (isInIframe || isPreviewHost) {
  // Eventuell vorhandene SW im Preview unbedingt entfernen
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
} else if (import.meta.env.PROD && "serviceWorker" in navigator) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* no-op */
    });
}
