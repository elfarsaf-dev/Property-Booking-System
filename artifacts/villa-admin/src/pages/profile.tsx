import { useState, useEffect } from "react";
import { getReservations, getAdminName, type Reservation } from "@/services/api";
import { formatRupiah, getStatusColor, getStatusLabel } from "@/utils/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, TrendingUp, Wallet, XCircle, Loader2, MessageCircle, Phone } from "lucide-react";

export default function ProfilePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const adminName = getAdminName();

  useEffect(() => {
    getReservations()
      .then(setReservations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const myBookings = reservations.filter(
    (r) => r.admin_name?.toLowerCase() === adminName?.toLowerCase()
  );
  const total = myBookings.length;
  const omset = myBookings.filter((r) => r.status === "lunas").reduce((s, r) => s + r.total_price, 0);
  const dp = myBookings.reduce((s, r) => s + r.dp, 0);
  const cancel = myBookings.filter((r) => r.status === "cancel").length;

  const byStatus = {
    lunas: myBookings.filter((r) => r.status === "lunas").length,
    pending: myBookings.filter((r) => r.status === "pending").length,
    cancel,
  };

  const byProperty: Record<string, number> = {};
  for (const r of myBookings) {
    byProperty[r.property_name] = (byProperty[r.property_name] || 0) + 1;
  }
  const propertyRanking = Object.entries(byProperty)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const initials = adminName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-white">Profile</h1>

      {/* Profile card */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 text-xl font-bold">
              {initials || "?"}
            </div>
            <div>
              <p className="text-white font-semibold text-lg capitalize">{adminName}</p>
              <p className="text-slate-400 text-sm">Admin Villa Booking</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Booking Saya", value: String(total), icon: CalendarCheck, color: "text-blue-400" },
              { label: "Omset Saya", value: formatRupiah(omset), icon: TrendingUp, color: "text-emerald-400" },
              { label: "DP Dikumpulkan", value: formatRupiah(dp), icon: Wallet, color: "text-amber-400" },
              { label: "Booking Cancel", value: String(cancel), icon: XCircle, color: "text-red-400" },
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

          {/* Status breakdown */}
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-semibold">Status Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["lunas", "pending", "cancel"] as const).map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(s)} border text-xs px-2`}>
                      {getStatusLabel(s)}
                    </Badge>
                  </div>
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

          {/* Top properties */}
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

      {/* Contact CS */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardContent className="p-5">
          <h4 className="text-white font-medium text-sm mb-1">Butuh Bantuan?</h4>
          <p className="text-slate-400 text-xs mb-4">Hubungi tim customer service kami</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => window.open("https://wa.me/628xxx", "_blank")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              data-testid="button-whatsapp"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              WhatsApp CS
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open("tel:628xxx")}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 text-xs"
              data-testid="button-phone"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              Telepon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
