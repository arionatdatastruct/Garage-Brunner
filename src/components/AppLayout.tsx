import { NavLink, Outlet } from "react-router-dom";
import { Calendar, Archive, BarChart3 } from "lucide-react";

const navItems = [
  { to: "/", label: "Wochenplan", icon: Calendar },
  { to: "/archiv", label: "Archiv", icon: Archive },
  { to: "/statistiken", label: "Statistiken", icon: BarChart3 },
];

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card">
        <div className="px-6 py-5 border-b border-border">
          <h1 className="text-lg font-bold tracking-tight">Werkstatt</h1>
          <p className="text-xs text-muted-foreground">Management</p>
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

      {/* Main */}
      <main className="flex-1 pb-16 md:pb-0 overflow-x-hidden">
        <Outlet />
      </main>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border flex z-40">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2 text-xs ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
