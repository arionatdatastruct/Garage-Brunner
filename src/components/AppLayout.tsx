import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Calendar, Archive, BarChart3, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { GlobalSearch } from "./GlobalSearch";

const navItems = [
  { to: "/", label: "Wochenplan", icon: Calendar },
  { to: "/archiv", label: "Archiv", icon: Archive },
  { to: "/statistiken", label: "Statistiken", icon: BarChart3 },
];

export function AppLayout() {
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState("Werkstatt");

  useEffect(() => {
    const match = navItems.find((item) =>
      item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
    );
    if (match) {
      setPageTitle(match.label);
    } else if (location.pathname.startsWith("/auftrag")) {
      setPageTitle("Auftrag");
    } else {
      setPageTitle("Werkstatt");
    }
  }, [location.pathname]);

  const onAuftragDetail = location.pathname.startsWith("/auftrag");

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card">
        <div className="px-6 py-5 border-b border-border space-y-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Werkstatt</h1>
            <p className="text-xs text-muted-foreground">Management</p>
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
      <header className="md:hidden sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border px-3 py-2 flex flex-col gap-2">
        <div className="flex items-center justify-between h-8">
          <h1 className="text-base font-semibold tracking-tight truncate">{pageTitle}</h1>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Werkstatt</span>
        </div>
        <GlobalSearch />
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
        {navItems.map(({ to, label, icon: Icon }) => (
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

      {/* Mobile Floating Action Button: Neuer Auftrag */}
      {!onAuftragDetail && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-neuer-auftrag"))}
          className="md:hidden fixed right-4 bottom-20 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Neuer Auftrag"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
