import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createReservation,
  updateReservation,
  getProperties,
  getAdminName,
  type Reservation,
  type Property,
} from "@/services/api";
import { formatRupiah, formatDate, getNights, getStatusColor, getStatusLabel } from "@/utils/helpers";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Edit2, X } from "lucide-react";

const schema = z.object({
  guest_name: z.string().min(1, "Nama tamu wajib diisi"),
  guest_phone: z.string().min(1, "Nomor HP wajib diisi"),
  property_name: z.string().min(1, "Pilih properti"),
  property_id: z.string(),
  checkin: z.string().min(1, "Tanggal checkin wajib"),
  checkout: z.string().min(1, "Tanggal checkout wajib"),
  total_price: z.coerce.number().min(0),
  dp: z.coerce.number().min(0),
  address: z.string(),
  people: z.string(),
  vehicles: z.string(),
  note: z.string(),
  status: z.enum(["pending", "lunas", "cancel"]),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  reservation?: Reservation | null;
  onSuccess: () => void;
  onDelete?: (id: string) => void;
  mode?: "view" | "edit" | "create";
}

const STATUS_OPTIONS = [
  {
    value: "pending" as const,
    label: "Pending",
    desc: "Belum lunas",
    activeClass: "bg-yellow-500 border-yellow-400 text-white shadow-[0_0_12px_rgba(234,179,8,0.4)]",
    inactiveClass: "bg-slate-800 border-slate-600 text-yellow-400 hover:border-yellow-500/60",
    dot: "bg-yellow-400",
  },
  {
    value: "lunas" as const,
    label: "Lunas",
    desc: "Lunas",
    activeClass: "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]",
    inactiveClass: "bg-slate-800 border-slate-600 text-emerald-400 hover:border-emerald-500/60",
    dot: "bg-emerald-400",
  },
  {
    value: "cancel" as const,
    label: "Cancel",
    desc: "Dibatalkan",
    activeClass: "bg-red-500 border-red-400 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]",
    inactiveClass: "bg-slate-800 border-slate-600 text-red-400 hover:border-red-500/60",
    dot: "bg-red-400",
  },
];

export default function ModalBooking({ open, onClose, reservation, onSuccess, onDelete, mode: initialMode = "create" }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filterType, setFilterType] = useState<"all" | "villa" | "glamping">("all");
  const [filterLocation, setFilterLocation] = useState("all");

  useEffect(() => { setMode(initialMode); }, [initialMode, open]);

  useEffect(() => {
    getProperties().then(setProperties).catch(() => {});
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      guest_name: "", guest_phone: "", property_name: "", property_id: "",
      checkin: "", checkout: "", total_price: 0, dp: 0,
      address: "", people: "", vehicles: "", note: "", status: "pending",
    },
  });

  useEffect(() => {
    if (reservation && open) {
      form.reset({
        guest_name: reservation.guest_name,
        guest_phone: reservation.guest_phone,
        property_name: reservation.property_name,
        property_id: reservation.property_id,
        checkin: reservation.checkin,
        checkout: reservation.checkout,
        total_price: reservation.total_price,
        dp: reservation.dp,
        address: reservation.address,
        people: reservation.people,
        vehicles: reservation.vehicles,
        note: reservation.note,
        status: reservation.status,
      });
    } else if (!reservation && open) {
      form.reset({
        guest_name: "", guest_phone: "", property_name: "", property_id: "",
        checkin: "", checkout: "", total_price: 0, dp: 0,
        address: "", people: "", vehicles: "", note: "", status: "pending",
      });
      setFilterType("all");
      setFilterLocation("all");
    }
  }, [reservation, open]);

  const locations = useMemo(() => {
    const locs = new Set(properties.map((p) => p.location).filter(Boolean));
    return [...locs].sort();
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const matchType = filterType === "all" || p.type === filterType;
      const matchLoc = filterLocation === "all" || p.location === filterLocation;
      return matchType && matchLoc;
    });
  }, [properties, filterType, filterLocation]);

  function handlePropertyChange(id: string) {
    if (id === "__manual__") {
      form.setValue("property_id", "__manual__");
      form.setValue("property_name", "");
      form.setValue("total_price", 0);
      return;
    }
    const prop = properties.find((p) => p.id === id);
    if (prop) {
      form.setValue("property_name", prop.name);
      form.setValue("property_id", prop.id);
      if (prop.rates && prop.rates.length > 0) {
        form.setValue("total_price", prop.rates[0].price);
      }
    }
  }

  async function handleQuickStatus(newStatus: "pending" | "lunas" | "cancel") {
    if (!reservation || newStatus === reservation.status) return;
    setStatusLoading(true);
    try {
      const res = await updateReservation({ ...reservation, status: newStatus });
      if (!res.ok) throw new Error();
      toast({ title: "Status diperbarui", description: `${reservation.guest_name} → ${newStatus}` });
      onSuccess();
      onClose();
    } catch {
      toast({ title: "Error", description: "Gagal mengubah status", variant: "destructive" });
    } finally {
      setStatusLoading(false);
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      if (mode === "edit" && reservation) {
        const res = await updateReservation({ ...reservation, ...data });
        if (!res.ok) throw new Error("Gagal update");
        toast({ title: "Berhasil", description: "Reservasi diperbarui" });
      } else {
        const res = await createReservation({ ...data, admin_name: getAdminName() });
        if (!res.ok) throw new Error("Gagal create");
        toast({ title: "Berhasil", description: "Reservasi ditambahkan" });
      }
      onSuccess();
      onClose();
    } catch {
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const nights = getNights(form.watch("checkin"), form.watch("checkout"));
  const isReadonly = mode === "view";
  const currentStatus = form.watch("status");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="
        bg-slate-900 border-slate-700 text-white
        w-[calc(100vw-1rem)] sm:w-full sm:max-w-2xl
        max-h-[88svh] sm:max-h-[90vh]
        flex flex-col gap-0 p-0 overflow-hidden
      ">
        {/* Header — sticky */}
        <DialogHeader className="shrink-0 px-4 sm:px-6 pt-5 pb-3 border-b border-slate-700/60">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-white text-base sm:text-lg">
              {mode === "create" ? "Tambah Booking" : mode === "edit" ? "Edit Booking" : "Detail Booking"}
            </DialogTitle>
            {reservation && (
              <Badge className={`${getStatusColor(reservation.status)} border text-xs`}>
                {getStatusLabel(reservation.status)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4">
          {mode === "view" && reservation ? (
            <>
              {/* Quick status change */}
              <div className="space-y-2">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Ubah Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const isActive = reservation.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={statusLoading || isActive}
                        onClick={() => handleQuickStatus(opt.value)}
                        className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all ${
                          isActive ? opt.activeClass : opt.inactiveClass
                        } ${isActive ? "cursor-default" : "cursor-pointer"} disabled:opacity-60`}
                      >
                        {statusLoading && !isActive
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-white" : opt.dot}`} />
                        }
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-sm">
                {[
                  ["Nama Tamu", reservation.guest_name],
                  ["No. HP", reservation.guest_phone],
                  ["Properti", reservation.property_name],
                  ["ID Properti", reservation.property_id],
                  ["Checkin", formatDate(reservation.checkin)],
                  ["Checkout", formatDate(reservation.checkout)],
                  ["Durasi", `${getNights(reservation.checkin, reservation.checkout)} malam`],
                  ["Asal", reservation.address],
                  ["Peserta", reservation.people],
                  ["Kendaraan", reservation.vehicles],
                  ["Total Harga", formatRupiah(reservation.total_price)],
                  ["DP", formatRupiah(reservation.dp)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-800/60 rounded-lg p-2.5">
                    <p className="text-slate-400 text-[11px] mb-0.5">{label}</p>
                    <p className="text-white font-medium text-sm break-words">{value || "-"}</p>
                  </div>
                ))}
              </div>
              {reservation.note && (
                <div className="bg-slate-800/60 rounded-lg p-3 text-sm">
                  <p className="text-slate-400 text-[11px] mb-0.5">Catatan</p>
                  <p className="text-white">{reservation.note}</p>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Nama + HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Nama Tamu *</Label>
                  <Input
                    {...form.register("guest_name")}
                    disabled={isReadonly}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                    placeholder="Nama tamu"
                  />
                  {form.formState.errors.guest_name && (
                    <p className="text-red-400 text-xs">{form.formState.errors.guest_name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">No. HP *</Label>
                  <Input
                    {...form.register("guest_phone")}
                    disabled={isReadonly}
                    type="tel"
                    className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                    placeholder="628xxx"
                  />
                </div>
              </div>

              {/* Properti */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Properti *</Label>
                {!isReadonly && (
                  <div className="flex flex-col gap-2">
                    {/* Type filter */}
                    <div className="flex gap-0 rounded-lg overflow-hidden border border-slate-600 self-start">
                      {(["all", "villa", "glamping"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setFilterType(t); form.setValue("property_id", ""); }}
                          className={`px-3 py-2 text-xs capitalize transition-colors ${
                            filterType === t
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          }`}
                        >
                          {t === "all" ? "Semua" : t}
                        </button>
                      ))}
                    </div>
                    {/* Location filter */}
                    <Select value={filterLocation} onValueChange={(v) => { setFilterLocation(v); form.setValue("property_id", ""); }}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs h-9 w-full sm:w-44">
                        <SelectValue placeholder="Filter lokasi" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all" className="text-white text-xs">Semua lokasi</SelectItem>
                        {locations.map((loc) => (
                          <SelectItem key={loc} value={loc} className="text-white text-xs">{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Select
                  disabled={isReadonly}
                  value={form.watch("property_id")}
                  onValueChange={handlePropertyChange}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-10">
                    <SelectValue placeholder="Pilih properti..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 max-h-52">
                    {filteredProperties.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-white hover:bg-slate-700">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            p.type === "villa" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                          }`}>{p.type}</span>
                          <span>{p.name}</span>
                          {p.location && <span className="text-slate-400 text-xs">· {p.location}</span>}
                          {p.rates?.[0] && <span className="text-slate-500 text-xs">· {formatRupiah(p.rates[0].price)}</span>}
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value="__manual__" className="text-slate-400">
                      ✏️ Input Manual
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.watch("property_id") === "__manual__" && (
                  <Input
                    {...form.register("property_name")}
                    disabled={isReadonly}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                    placeholder="Nama properti manual"
                  />
                )}
                {form.formState.errors.property_name && (
                  <p className="text-red-400 text-xs">{form.formState.errors.property_name.message}</p>
                )}
              </div>

              {/* Checkin / Checkout */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Checkin *</Label>
                  <Input
                    type="date"
                    {...form.register("checkin")}
                    disabled={isReadonly}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Checkout *</Label>
                  <Input
                    type="date"
                    {...form.register("checkout")}
                    disabled={isReadonly}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                  />
                </div>
              </div>
              {nights > 0 && (
                <p className="text-blue-400 text-xs -mt-2 font-medium">⏱ Durasi: {nights} malam</p>
              )}

              {/* Harga / DP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">
                    Total Harga (Rp)
                    {!isReadonly && form.watch("property_id") && form.watch("property_id") !== "__manual__" && (
                      <span className="ml-1 text-blue-400 font-normal">· auto</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    {...form.register("total_price")}
                    disabled={isReadonly}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">DP (Rp)</Label>
                  <Input
                    type="number"
                    {...form.register("dp")}
                    disabled={isReadonly}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Asal */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Asal / Alamat</Label>
                <Input
                  {...form.register("address")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                  placeholder="Solo, Jakarta, dll"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Status</Label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isReadonly}
                      onClick={() => !isReadonly && form.setValue("status", opt.value)}
                      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all ${
                        currentStatus === opt.value ? opt.activeClass : opt.inactiveClass
                      } ${isReadonly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        currentStatus === opt.value ? "bg-white" : opt.dot
                      }`} />
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Peserta + Kendaraan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Tamu (dewasa/anak)</Label>
                  <Input
                    {...form.register("people")}
                    disabled={isReadonly}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                    placeholder="dewasa:2, anak:1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Kendaraan</Label>
                  <Input
                    {...form.register("vehicles")}
                    disabled={isReadonly}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                    placeholder="mobil:1"
                  />
                </div>
              </div>

              {/* Catatan */}
              <div className="space-y-1.5 pb-1">
                <Label className="text-slate-300 text-xs">Catatan</Label>
                <Textarea
                  {...form.register("note")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm min-h-[80px] resize-none"
                  placeholder="Catatan tambahan..."
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer — sticky */}
        <DialogFooter className="shrink-0 flex flex-row gap-2 px-4 sm:px-6 py-3 border-t border-slate-700/60 bg-slate-900">
          {mode === "view" && reservation && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete?.(reservation.id)}
                className="flex-1 sm:flex-none border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-10"
                data-testid="button-delete"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Hapus
              </Button>
              <Button
                size="sm"
                onClick={() => setMode("edit")}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white h-10"
                data-testid="button-edit"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            </>
          )}
          {(mode === "edit" || mode === "create") && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex-1 sm:flex-none border-slate-600 text-slate-300 hover:bg-slate-800 h-10"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Batal
              </Button>
              <Button
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
                disabled={loading}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white h-10"
                data-testid="button-save"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {mode === "edit" ? "Simpan" : "Tambah"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
