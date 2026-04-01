import { useLocation, Link } from "wouter";
import { logout, getAdminName } from "@/services/api";
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/katalog", label: "Katalog", icon: Building2 },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    setLocation("/login");
  }

  const adminName = getAdminName();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-slate-900 border-r border-slate-800 fixed h-full z-20">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Villa Admin</p>
            <p className="text-slate-400 text-xs capitalize">{adminName}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <a
                  data-testid={`nav-${label.toLowerCase()}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </a>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            data-testid="button-logout"
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-400" />
          <span className="text-white font-semibold text-sm">Villa Admin</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-slate-400 hover:text-white">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-slate-950/80" onClick={() => setMobileOpen(false)}>
          <div className="w-60 h-full bg-slate-900 border-r border-slate-800 flex flex-col pt-14" onClick={(e) => e.stopPropagation()}>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = location === href;
                return (
                  <Link key={href} href={href}>
                    <a
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </a>
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-slate-400 hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-60 pt-14 md:pt-0">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
