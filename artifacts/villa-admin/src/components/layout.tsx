import { useLocation, Link } from "wouter";
import { logout, getAdminName, isSuperAdmin } from "@/services/api";
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/katalog", label: "Katalog", icon: Building2 },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  function handleLogout() {
    logout();
    setLocation("/login");
  }

  const adminName = getAdminName();
  const superAdmin = isSuperAdmin();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-slate-900 border-r border-slate-800 fixed h-full z-20">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            superAdmin ? "bg-amber-500/20 border border-amber-400/30" : "bg-blue-500/20 border border-blue-400/30"
          }`}>
            {superAdmin
              ? <ShieldCheck className="w-4 h-4 text-amber-400" />
              : <Building2 className="w-4 h-4 text-blue-400" />}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Villa Admin</p>
            <p className={`text-xs capitalize ${superAdmin ? "text-amber-400 font-medium" : "text-slate-400"}`}>
              {adminName} {superAdmin && "✦"}
            </p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${label.toLowerCase()}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? superAdmin
                      ? "bg-amber-600 text-white"
                      : "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
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

      {/* Mobile top bar (simple brand only) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {superAdmin
            ? <ShieldCheck className="w-5 h-5 text-amber-400" />
            : <Building2 className="w-5 h-5 text-blue-400" />}
          <span className="text-white font-semibold text-sm">Villa Admin</span>
          {superAdmin && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-400/30 rounded-full px-2 py-0.5 font-medium">
              Super
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile bottom navbar — glassmorphism */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-2"
        style={{
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(148, 163, 184, 0.10)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location === href || location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                active
                  ? superAdmin
                    ? "bg-amber-500/25 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                    : "bg-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                  : "bg-transparent"
              }`}>
                <Icon className={`w-5 h-5 transition-colors ${
                  active
                    ? superAdmin ? "text-amber-400" : "text-blue-400"
                    : "text-slate-500"
                }`} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                active
                  ? superAdmin ? "text-amber-400" : "text-blue-400"
                  : "text-slate-500"
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-60 pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
