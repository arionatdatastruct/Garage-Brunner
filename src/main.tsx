import { createRoot } from "react-dom/client";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

// Safety-Net: Wenn ein Supabase-Recovery-Token oder ein Recovery-Fehlerhash
// an irgendeiner Route ankommt — z.B. weil Supabase als Site URL nur "/" nutzt —
// rendern wir direkt die Reset-Seite, BEVOR die Haupt-App/Supabase-Session lädt.
const shouldRenderPasswordReset = (() => {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const searchParams = new URLSearchParams(search);
  const isRecoveryHash =
    hashParams.get("type") === "recovery" && !!hashParams.get("access_token");
  const isRecoveryError =
    hashParams.get("error_code") === "otp_expired" ||
    hashParams.get("error") === "access_denied" ||
    searchParams.get("error_code") === "otp_expired" ||
    searchParams.get("error") === "access_denied";
  const isRecoveryCode =
    !!searchParams.get("code") &&
    (searchParams.get("type") === "recovery" || hashParams.get("type") === "recovery");
  // PKCE-Code ohne expliziten type kann auch Recovery sein — sicherheitshalber mitnehmen,
  // wenn der Code-Parameter alleine vorkommt und kein User eingeloggt ist.
  const hasBareCode = !!searchParams.get("code") && !searchParams.get("state");
  return pathname === "/reset-password" || isRecoveryHash || isRecoveryError || isRecoveryCode || hasBareCode;
})();

if (shouldRenderPasswordReset) {
  import("./pages/ResetPassword.tsx").then(({ default: ResetPassword }) => {
    root.render(<ResetPassword />);
  });
} else {
  import("./App.tsx").then(({ default: App }) => {
    root.render(<App />);
  });
}

// Kein App-Shell-PWA-Caching mehr: alte Service-Worker können veraltete Router-
// Bundles ausliefern und dadurch /reset-password fälschlich als 404 anzeigen.
// Die App bleibt installierbar über das Manifest, aber HTML/JS wird nicht mehr
// offline gecacht.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((registration) => registration.unregister());
  });
}
