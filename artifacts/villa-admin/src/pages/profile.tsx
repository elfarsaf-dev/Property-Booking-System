import { useState, useEffect, useMemo } from "react";
import { getReservations, getAdminName, isSuperAdmin, type Reservation } from "@/services/api";
import { formatRupiah, getStatusColor, getStatusLabel } from "@/utils/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, TrendingUp, Wallet, XCircle, Loader2, MessageCircle, Phone, ShieldCheck } from "lucide-react";

/* ─── Avatar color cycling ─── */
const AVATAR_PALETTES = [
  "bg-blue-500/20   border-blue-400/30   text-blue-400",
  "bg-purple-500/20 border-purple-400/30 text-purple-400",
  "bg-emerald-500/20 border-emerald-400/30 text-emerald-400",
  "bg-amber-500/20  border-amber-400/30  text-amber-400",
  "bg-pink-500/20   border-pink-400/30   text-pink-400",
  "bg-cyan-500/20   border-cyan-400/30   text-cyan-400",
  "bg-rose-500/20   border-rose-400/30   text-rose-400",
  "bg-indigo-500/20 border-indigo-400/30 text-indigo-400",
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

/* ─── Single admin profile card (superadmin view) ─── */
function AdminProfileCard({ adminName, reservations, paletteIdx }: {
  adminName: string; reservations: Reservation[]; paletteIdx: number;
}) {
  const pal     = AVATAR_PALETTES[paletteIdx % AVATAR_PALETTES.length];
  const total   = reservations.length;
  const omset   = reservations.filter((r) => r.status === "lunas").reduce((s, r) => s + r.total_price, 0);
  const dp      = reservations.reduce((s, r) => s + r.dp, 0);
  const cancel  = reservations.filter((r) => r.status === "cancel").length;
  const lunas   = reservations.filter((r) => r.status === "lunas").length;
  const pending = reservations.filter((r) => r.status === "pending").length;

  const byProp: Record<string, number> = {};
  for (const r of reservations) {
    const k = r.property_name?.trim() || "Tanpa Properti";
    byProp[k] = (byProp[k] || 0) + 1;
  }
  const topProps = Object.entries(byProp).sort(([, a], [, b]) => b - a).slice(0, 3);

  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardContent className="p-5 space-y-4">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-lg font-bold flex-shrink-0 ${pal}`}>
            {initials(adminName)}
          </div>
          <div>
            <p className="text-white font-semibold capitalize">{adminName}</p>
            <p className="text-slate-400 text-xs">Admin Villa Booking</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Total Booking", value: String(total),      color: "text-blue-400" },
            { label: "Omset Lunas",   value: formatRupiah(omset), color: "text-emerald-400" },
            { label: "DP Masuk",      value: formatRupiah(dp),    color: "text-amber-400" },
            { label: "Booking Cancel",value: String(cancel),      color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-700/40 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1">{label}</p>
              <p className={`font-bold text-sm ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Status mini bar */}
        <div className="space-y-1.5">
          {([["lunas", lunas, "bg-emerald-500"], ["pending", pending, "bg-amber-500"], ["cancel", cancel, "bg-red-500"]] as const).map(
            ([s, count, bar]) => (
              <div key={s} className="flex items-center gap-2">
                <Badge className={`${getStatusColor(s)} border text-xs px-1.5 py-0 w-16 justify-center`}>
                  {getStatusLabel(s)}
                </Badge>
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bar}`}
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-slate-400 text-xs w-4 text-right">{count}</span>
              </div>
            )
          )}
        </div>

        {/* Top properties */}
        {topProps.length > 0 && (
          <div className="space-y-1">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Top Properti</p>
            {topProps.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 text-xs">{i + 1}.</span>
                  <span className="text-slate-300 text-xs truncate max-w-[160px]">{name}</span>
                </div>
                <span className="text-white text-xs font-medium">{count}x</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Main page ─── */
export default function ProfilePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]   = useState(true);
  const adminName   = getAdminName();
  const superAdmin  = isSuperAdmin();

  useEffect(() => {
    getReservations()
      .then(setReservations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ─── Superadmin: group all reservations by admin ─── */
  const adminGroups = useMemo(() => {
    if (!superAdmin) return null;
    const groups: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      const key = r.admin_name?.trim() || "(tanpa admin)";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return Object.entries(groups).sort(([, a], [, b]) => b.length - a.length);
  }, [reservations, superAdmin]);

  /* ─── Regular admin: own stats ─── */
  const myBookings = useMemo(
    () => reservations.filter((r) => r.admin_name?.toLowerCase() === adminName?.toLowerCase()),
    [reservations, adminName]
  );
  const total   = myBookings.length;
  const omset   = myBookings.filter((r) => r.status === "lunas").reduce((s, r) => s + r.total_price, 0);
  const dp      = myBookings.reduce((s, r) => s + r.dp, 0);
  const cancel  = myBookings.filter((r) => r.status === "cancel").length;
  const byStatus = {
    lunas:   myBookings.filter((r) => r.status === "lunas").length,
    pending: myBookings.filter((r) => r.status === "pending").length,
    cancel,
  };
  const byProperty: Record<string, number> = {};
  for (const r of myBookings) {
    byProperty[r.property_name] = (byProperty[r.property_name] || 0) + 1;
  }
  const propertyRanking = Object.entries(byProperty).sort(([, a], [, b]) => b - a).slice(0, 5);

  /* ─── SUPERADMIN VIEW ─── */
  if (superAdmin) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Profile Semua Admin</h1>
            <p className="text-slate-400 text-sm">
              {loading ? "Memuat..." : `${adminGroups?.length ?? 0} admin · ${reservations.length} total booking`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {adminGroups?.map(([name, data], i) => (
              <AdminProfileCard key={name} adminName={name} reservations={data} paletteIdx={i} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ─── REGULAR ADMIN VIEW ─── */
  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-white">Profile</h1>

      {/* Profile card */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 text-xl font-bold">
              {initials(adminName)}
            </div>
            <div>
              <p className="text-white font-semibold text-lg capitalize">{adminName}</p>
              <p className="text-slate-400 text-sm">Admin Villa Booking</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Booking Saya", value: String(total),      icon: CalendarCheck, color: "text-blue-400" },
              { label: "Omset Saya",          value: formatRupiah(omset), icon: TrendingUp,   color: "text-emerald-400" },
              { label: "DP Dikumpulkan",      value: formatRupiah(dp),    icon: Wallet,       color: "text-amber-400" },
              { label: "Booking Cancel",      value: String(cancel),      icon: XCircle,      color: "text-red-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="bg-slate-800/60 border-slate-700/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${color}`} />
                  <div>
                    <p className="text-slate-400 text-xs">{label}</p>
                    <p className="text-white font-bold text-lg leading-tight">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-semibold">Status Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["lunas", "pending", "cancel"] as const).map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <Badge className={`${getStatusColor(s)} border text-xs px-2`}>
                    {getStatusLabel(s)}
                  </Badge>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s === "lunas" ? "bg-emerald-500" : s === "pending" ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: total > 0 ? `${(byStatus[s] / total) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="text-white text-sm font-medium w-6 text-right">{byStatus[s]}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {propertyRanking.length > 0 && (
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-semibold">Properti Paling Banyak</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {propertyRanking.map(([name, count], i) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs w-5">{i + 1}.</span>
                      <span className="text-slate-300 text-sm">{name}</span>
                    </div>
                    <span className="text-white font-medium text-sm">{count} booking</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardContent className="p-5">
          <h4 className="text-white font-medium text-sm mb-1">Butuh Bantuan?</h4>
          <p className="text-slate-400 text-xs mb-4">Hubungi tim customer service kami</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => window.open("https://wa.me/628xxx", "_blank")} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> WhatsApp CS
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open("tel:628xxx")} className="border-slate-600 text-slate-300 hover:bg-slate-800 text-xs">
              <Phone className="w-3.5 h-3.5 mr-1.5" /> Telepon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
