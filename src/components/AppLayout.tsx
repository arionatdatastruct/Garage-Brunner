import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Calendar, Archive, BarChart3, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { GlobalSearch } from "./GlobalSearch";
import { Button } from "@/components/ui/button";
import logo from "@/assets/garage-brunner-logo.svg";

const navItems = [
  { to: "/", label: "Wochenplan", icon: Calendar },
  { to: "/archiv", label: "Archiv", icon: Archive },
  { to: "/statistiken", label: "Statistiken", icon: BarChart3 },
];

// Mobile zeigt nur die Tagesübersicht — keine Statistiken, keine Suche
const mobileNavItems = [
  { to: "/", label: "Wochenplan", icon: Calendar },
  { to: "/archiv", label: "Archiv", icon: Archive },
];

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
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card">
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
        <nav className="flex-1 p-3 space-y-1">
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
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border px-3 py-2">
        <div className="flex items-center justify-between h-9 gap-2">
          <img
            src={logo}
            alt="Garage Brunner Wynigen"
            className="h-7 w-auto select-none shrink-0"
            draggable={false}
          />
          <span className="text-xs text-muted-foreground truncate">{pageTitle}</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 pb-20 md:pb-0 overflow-x-hidden">
        <Outlet />
      </main>

      {/* Bottom Nav Mobile */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border flex z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Hauptnavigation"
      >
        {mobileNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center h-7 w-12 rounded-full transition-colors ${
                    isActive ? "bg-primary/15" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* FAB entfernt: Auftrag erstellen nur auf PC möglich (Beleg nötig) */}
    </div>
  );
}
