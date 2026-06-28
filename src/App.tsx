import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { AuthGate } from "@/components/AuthGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Wochenplan from "./pages/Wochenplan";

// Lazy-load every non-start route so heavy deps (recharts, jszip, pdfjs, react-pdf,
// etc.) only ship in the chunk that needs them.
const Archiv = lazy(() => import("./pages/Archiv"));
const Statistiken = lazy(() => import("./pages/Statistiken"));
const AuftragDetail = lazy(() => import("./pages/AuftragDetail"));
const KundeDetail = lazy(() => import("./pages/KundeDetail"));
const FahrzeugDetail = lazy(() => import("./pages/FahrzeugDetail"));
const Fahrzeuge = lazy(() => import("./pages/Fahrzeuge"));
const Kunden = lazy(() => import("./pages/Kunden"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
    <Loader2 className="h-5 w-5 animate-spin" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster position="top-center" mobileOffset={{ bottom: "5rem" }} />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Öffentliche Route: Passwort-Reset-Ziel (nicht in Navigation verlinkt).
                Muss VOR dem AuthGate liegen, damit der Recovery-Link auch ohne
                bestehende Session erreichbar ist. */}
            <Route path="/reset-password/*" element={<ResetPassword />} />
            <Route
              path="*"
              element={
                <AuthGate>
                  <Routes>
                    <Route element={<AppLayout />}>
                      <Route path="/" element={<Wochenplan />} />
                      <Route path="/fahrzeuge" element={<Fahrzeuge />} />
                      <Route path="/kunden" element={<Kunden />} />
                      <Route path="/archiv" element={<Archiv />} />
                      <Route path="/statistiken" element={<Statistiken />} />
                      <Route path="/auftrag/:id" element={<AuftragDetail />} />
                      <Route path="/kunde/:nummer" element={<KundeDetail />} />
                      <Route path="/fahrzeug/:kennzeichen" element={<FahrzeugDetail />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AuthGate>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
