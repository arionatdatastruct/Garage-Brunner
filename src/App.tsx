import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthGate } from "@/components/AuthGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TimerProvider } from "@/contexts/TimerContext";
import Wochenplan from "./pages/Wochenplan";
import Archiv from "./pages/Archiv";
import Statistiken from "./pages/Statistiken";
import AuftragDetail from "./pages/AuftragDetail";
import KundeDetail from "./pages/KundeDetail";
import FahrzeugDetail from "./pages/FahrzeugDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="top-center" mobileOffset={{ bottom: "5rem" }} />
        <AuthGate>
          <TimerProvider>
            <BrowserRouter>
              <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Wochenplan />} />
                <Route path="/archiv" element={<Archiv />} />
                <Route path="/statistiken" element={<Statistiken />} />
                <Route path="/auftrag/:id" element={<AuftragDetail />} />
                <Route path="/kunde/:nummer" element={<KundeDetail />} />
                <Route path="/fahrzeug/:kennzeichen" element={<FahrzeugDetail />} />
              </Route>
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TimerProvider>
        </AuthGate>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
