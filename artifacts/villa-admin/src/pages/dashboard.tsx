import { useState, useEffect, useMemo } from "react";
import { getReservations, getAdminName, isSuperAdmin, type Reservation } from "@/services/api";
import { formatRupiah, formatDate, getStatusColor, getStatusLabel } from "@/utils/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  CalendarCheck,
  TrendingUp,
  Wallet,
  XCircle,
  Loader2,
  Users,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-white mt-1">{value}</p>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function AdminGroup({ adminName, reservations }: { adminName: string; reservations: Reservation[] }) {
  const [open, setOpen] = useState(false);

  const total = reservations.length;
  const totalOmset = reservations.filter((r) => r.status === "lunas").reduce((s, r) => s + r.total_price, 0);
  const totalDp = reservations.reduce((s, r) => s + r.dp, 0);
  const dpHangus = reservations.filter((r) => r.status === "cancel").reduce((s, r) => s + r.dp, 0);

  const recent = [...reservations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <span className="text-blue-400 text-xs font-bold uppercase">{adminName.slice(0, 2)}</span>
            </div>
            <div>
              <CardTitle className="text-white text-sm font-semibold capitalize">{adminName}</CardTitle>
              <p className="text-slate-500 text-xs">{total} booking · {formatRupiah(totalOmset)} omset</p>
            </div>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={CalendarCheck} label="Booking" value={String(total)} color="bg-blue-500/20 text-blue-400" />
            <StatCard icon={TrendingUp} label="Omset" value={formatRupiah(totalOmset)} color="bg-emerald-500/20 text-emerald-400" />
            <StatCard icon={Wallet} label="DP Masuk" value={formatRupiah(totalDp)} color="bg-amber-500/20 text-amber-400" />
            <StatCard icon={XCircle} label="DP Hangus" value={formatRupiah(dpHangus)} color="bg-red-500/20 text-red-400" />
          </div>

          {recent.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left pb-2 font-medium">Tamu</th>
                    <th className="text-left pb-2 font-medium">Properti</th>
                    <th className="text-left pb-2 font-medium">Checkin</th>
                    <th className="text-left pb-2 font-medium">Total</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b border-slate-700/40">
                      <td className="py-2 text-white font-medium">{r.guest_name}</td>
                      <td className="py-2 text-slate-300">{r.property_name}</td>
                      <td className="py-2 text-slate-400">{formatDate(r.checkin)}</td>
                      <td className="py-2 text-slate-300">{formatRupiah(r.total_price)}</td>
                      <td className="py-2">
                        <Badge className={`${getStatusColor(r.status)} border text-xs px-1.5 py-0`}>
                          {getStatusLabel(r.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const superAdmin = isSuperAdmin();
  const adminName = getAdminName();

  useEffect(() => {
    getReservations()
      .then(setReservations)
      .catch(() => setError("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, []);

  const myReservations = useMemo(() => {
    if (superAdmin) return reservations;
    return reservations.filter((r) => r.admin_name?.toLowerCase() === adminName.toLowerCase());
  }, [reservations, superAdmin, adminName]);

  const adminGroups = useMemo(() => {
    if (!superAdmin) return {};
    const groups: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      const key = r.admin_name || "(tanpa admin)";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  }, [reservations, superAdmin]);

  const total = myReservations.length;
  const totalOmset = myReservations.filter((r) => r.status === "lunas").reduce((s, r) => s + r.total_price, 0);
  const totalDp = myReservations.reduce((s, r) => s + r.dp, 0);
  const dpHangus = myReservations.filter((r) => r.status === "cancel").reduce((s, r) => s + r.dp, 0);

  const recent = [...myReservations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const perHari: Record<string, number> = {};
  for (const r of myReservations) {
    if (r.status === "lunas") {
      const date = r.checkin?.slice(0, 10) || "";
      perHari[date] = (perHari[date] || 0) + r.total_price;
    }
  }
  const lineData = Object.entries(perHari)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, nominal]) => ({ tanggal: date.slice(5), nominal }));

  const villaCount = myReservations.filter((r) =>
    r.property_id?.includes("villa") || r.property_name?.toLowerCase().includes("villa")
  ).length;
  const glampingCount = myReservations.filter((r) =>
    r.property_id?.includes("glamping") || r.property_name?.toLowerCase().includes("glamping")
  ).length;
  const otherCount = total - villaCount - glampingCount;
  const pieData = [
    { name: "Villa", value: villaCount },
    { name: "Glamping", value: glampingCount },
    ...(otherCount > 0 ? [{ name: "Lainnya", value: otherCount }] : []),
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            {superAdmin && <ShieldCheck className="w-5 h-5 text-amber-400" />}
            Dashboard
          </h1>
          <p className="text-slate-400 text-sm">
            {superAdmin
              ? `Superadmin · ${reservations.length} total booking dari ${Object.keys(adminGroups).length} admin`
              : `Booking saya · ${adminName}`}
          </p>
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label={superAdmin ? "Total Semua" : "Total Booking"} value={String(total)} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={TrendingUp} label="Total Omset" value={formatRupiah(totalOmset)} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={Wallet} label="DP Masuk" value={formatRupiah(totalDp)} color="bg-amber-500/20 text-amber-400" />
        <StatCard icon={XCircle} label="DP Hangus" value={formatRupiah(dpHangus)} color="bg-red-500/20 text-red-400" />
      </div>

      {/* Superadmin: per-admin groups */}
      {superAdmin && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h2 className="text-white font-semibold text-sm">Data Per Admin</h2>
          </div>
          {Object.entries(adminGroups)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([name, data]) => (
              <AdminGroup key={name} adminName={name} reservations={data} />
            ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-semibold">
              Omset 14 Hari Terakhir {superAdmin ? "(Semua Admin)" : `(${adminName})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lineData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Belum ada data lunas</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData}>
                  <XAxis dataKey="tanggal" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(v: number) => [formatRupiah(v), "Omset"]}
                  />
                  <Line type="monotone" dataKey="nominal" stroke={superAdmin ? "#f59e0b" : "#3b82f6"} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-semibold">Tipe Properti</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Belum ada data</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent */}
      {!superAdmin && (
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Booking Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Belum ada booking</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left pb-2 font-medium">Tamu</th>
                      <th className="text-left pb-2 font-medium">Properti</th>
                      <th className="text-left pb-2 font-medium">Checkin</th>
                      <th className="text-left pb-2 font-medium">Total</th>
                      <th className="text-left pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="py-2.5 text-white font-medium">{r.guest_name}</td>
                        <td className="py-2.5 text-slate-300">{r.property_name}</td>
                        <td className="py-2.5 text-slate-400">{formatDate(r.checkin)}</td>
                        <td className="py-2.5 text-slate-300">{formatRupiah(r.total_price)}</td>
                        <td className="py-2.5">
                          <Badge className={`${getStatusColor(r.status)} border text-xs px-2 py-0.5`}>
                            {getStatusLabel(r.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
