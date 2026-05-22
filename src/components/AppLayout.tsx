import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Calendar, Archive, BarChart3, Menu, X, LogOut, Car, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { GlobalSearch } from "./GlobalSearch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/garage-brunner-logo.svg";

const handleLogout = () => {
  supabase.auth.signOut();
};

const navItems = [
  { to: "/", label: "Wochenplan", icon: Calendar },
  { to: "/fahrzeuge", label: "Fahrzeuge", icon: Car },
  { to: "/kunden", label: "Kunden", icon: Users },
  { to: "/archiv", label: "Archiv", icon: Archive },
  { to: "/statistiken", label: "Statistiken", icon: BarChart3 },
];

// Mobile Bottom-Nav entfernt – Navigation nur über Sidebar/Menu

export function AppLayout() {
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState("Werkstatt");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const onAuftragDetail = location.pathname.startsWith("/auftrag");

  useEffect(() => {
    const match = navItems.find((item) =>
      item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
    );
    if (match) {
      setPageTitle(match.label);
    } else if (onAuftragDetail) {
      setPageTitle("Auftrag");
    } else {
      setPageTitle("Werkstatt");
    }
    // Sidebar bei Routenwechsel schliessen
    setSidebarOpen(false);
  }, [location.pathname, onAuftragDetail]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Off-Canvas Sidebar (Mobile, Tablet, und Desktop auf Auftrags-Detail) */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-64 border-r border-border bg-card shadow-2xl animate-in slide-in-from-left">
            <div className="px-5 py-5 border-b border-border space-y-3">
              <div className="flex items-center justify-between">
                <img
                  src={logo}
                  alt="Garage Brunner Wynigen"
                  className="h-10 w-auto select-none"
                  draggable={false}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Menü schliessen"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <GlobalSearch />
            </div>
            <nav className="flex-1 p-3 space-y-1 border-0 border-orange-700">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* Top Bar — auf Auftrags-Detail immer, sonst nur unter lg */}
      <header
        className={`${onAuftragDetail ? "" : "lg:hidden"} sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border px-3 py-2`}
      >
        <div className="flex items-center justify-between h-9 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menü öffnen"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <img
              src={logo}
              alt="Garage Brunner Wynigen"
              className="h-7 w-auto select-none shrink-0"
              draggable={false}
            />
          </div>
          <span className="text-xs text-muted-foreground truncate">{pageTitle}</span>
        </div>
      </header>

      {/* Body: feste Sidebar (nur lg+ und nicht auf Auftrags-Detail) + Main */}
      <div className="flex-1 flex flex-row min-h-0">
        {!onAuftragDetail && (
          <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-card">
            <div className="px-5 py-5 border-b border-border space-y-3">
              <div className="flex items-center justify-center">
                <img
                  src={logo}
                  alt="Garage Brunner Wynigen"
                  className="h-12 w-auto select-none"
                  draggable={false}
                />
              </div>
              <GlobalSearch />
            </div>
            <nav className="flex-1 p-3 space-y-1 border-0 border-orange-700">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* FAB entfernt: Auftrag erstellen nur auf PC möglich (Beleg nötig) */}
    </div>
  );
}
