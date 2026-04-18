import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Wochenplan from "./pages/Wochenplan";
import Archiv from "./pages/Archiv";
import Statistiken from "./pages/Statistiken";
import AuftragDetail from "./pages/AuftragDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Wochenplan />} />
            <Route path="/archiv" element={<Archiv />} />
            <Route path="/statistiken" element={<Statistiken />} />
            <Route path="/auftrag/:id" element={<AuftragDetail />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
