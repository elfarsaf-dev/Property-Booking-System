import { useState, useEffect } from "react";
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

export default function ModalBooking({ open, onClose, reservation, onSuccess, onDelete, mode: initialMode = "create" }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, open]);

  useEffect(() => {
    getProperties().then(setProperties).catch(() => {});
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      guest_name: "",
      guest_phone: "",
      property_name: "",
      property_id: "",
      checkin: "",
      checkout: "",
      total_price: 0,
      dp: 0,
      address: "",
      people: "",
      vehicles: "",
      note: "",
      status: "pending",
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
        guest_name: "",
        guest_phone: "",
        property_name: "",
        property_id: "",
        checkin: "",
        checkout: "",
        total_price: 0,
        dp: 0,
        address: "",
        people: "",
        vehicles: "",
        note: "",
        status: "pending",
      });
    }
  }, [reservation, open]);

  function handlePropertyChange(id: string) {
    const prop = properties.find((p) => p.id === id);
    if (prop) {
      form.setValue("property_name", prop.name);
      form.setValue("property_id", prop.id);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">
              {mode === "create" ? "Tambah Booking" : mode === "edit" ? "Edit Booking" : "Detail Booking"}
            </DialogTitle>
            {reservation && (
              <Badge className={`${getStatusColor(reservation.status)} border text-xs`}>
                {getStatusLabel(reservation.status)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {mode === "view" && reservation ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Tamu", reservation.guest_name],
                ["No. HP", reservation.guest_phone],
                ["Properti", reservation.property_name],
                ["ID Properti", reservation.property_id],
                ["Checkin", formatDate(reservation.checkin)],
                ["Checkout", formatDate(reservation.checkout)],
                ["Malam", `${getNights(reservation.checkin, reservation.checkout)} malam`],
                ["Asal", reservation.address],
                ["Tamu", reservation.people],
                ["Kendaraan", reservation.vehicles],
                ["Total Harga", formatRupiah(reservation.total_price)],
                ["DP", formatRupiah(reservation.dp)],
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-800/60 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-0.5">{label}</p>
                  <p className="text-white font-medium">{value || "-"}</p>
                </div>
              ))}
            </div>
            {reservation.note && (
              <div className="bg-slate-800/60 rounded-lg p-3 text-sm">
                <p className="text-slate-400 text-xs mb-0.5">Catatan</p>
                <p className="text-white">{reservation.note}</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Nama Tamu *</Label>
                <Input
                  {...form.register("guest_name")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
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
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                  placeholder="628xxx"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Properti *</Label>
              <Select
                disabled={isReadonly}
                value={form.watch("property_id")}
                onValueChange={handlePropertyChange}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-9">
                  <SelectValue placeholder="Pilih properti..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white hover:bg-slate-700">
                      {p.name} — {p.location}
                    </SelectItem>
                  ))}
                  <SelectItem value="__manual__" className="text-slate-400">
                    Input Manual
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.watch("property_id") === "__manual__" && (
                <Input
                  {...form.register("property_name")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9 mt-1"
                  placeholder="Nama properti"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Checkin *</Label>
                <Input
                  type="date"
                  {...form.register("checkin")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Checkout *</Label>
                <Input
                  type="date"
                  {...form.register("checkout")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                />
              </div>
            </div>
            {nights > 0 && (
              <p className="text-blue-400 text-xs -mt-2">Durasi: {nights} malam</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Total Harga (Rp)</Label>
                <Input
                  type="number"
                  {...form.register("total_price")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">DP (Rp)</Label>
                <Input
                  type="number"
                  {...form.register("dp")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Asal / Alamat</Label>
                <Input
                  {...form.register("address")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                  placeholder="Solo, Jakarta, dll"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Status</Label>
                <Select
                  disabled={isReadonly}
                  value={form.watch("status")}
                  onValueChange={(v) => form.setValue("status", v as "pending" | "lunas" | "cancel")}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pending" className="text-white">Pending</SelectItem>
                    <SelectItem value="lunas" className="text-white">Lunas</SelectItem>
                    <SelectItem value="cancel" className="text-white">Cancel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Tamu (dewasa/anak)</Label>
                <Input
                  {...form.register("people")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                  placeholder="dewasa:2, anak:1"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Kendaraan</Label>
                <Input
                  {...form.register("vehicles")}
                  disabled={isReadonly}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                  placeholder="mobil:1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Catatan</Label>
              <Textarea
                {...form.register("note")}
                disabled={isReadonly}
                className="bg-slate-800 border-slate-600 text-white text-sm min-h-[70px] resize-none"
                placeholder="Catatan tambahan..."
              />
            </div>
          </form>
        )}

        <DialogFooter className="gap-2 mt-2">
          {mode === "view" && reservation && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete?.(reservation.id)}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                data-testid="button-delete"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Hapus
              </Button>
              <Button
                size="sm"
                onClick={() => setMode("edit")}
                className="bg-blue-600 hover:bg-blue-500 text-white"
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
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Batal
              </Button>
              <Button
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white"
                data-testid="button-save"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {mode === "edit" ? "Simpan Perubahan" : "Tambah Booking"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
