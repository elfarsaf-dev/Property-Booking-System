import { useState, useEffect, useMemo } from "react";
import {
  getReservations,
  deleteReservation,
  getAdminName,
  isSuperAdmin,
  type Reservation,
} from "@/services/api";
import { formatRupiah, formatDate, getStatusColor, getStatusLabel, exportToCSV, exportToPDF } from "@/utils/helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ModalBooking from "@/components/modal-booking";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  FileDown,
  Loader2,
  RefreshCw,
  ChevronRight,
  User,
} from "lucide-react";

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

export default function BookingsPage() {
  const { toast } = useToast();
  const adminName = getAdminName();
  const superAdmin = isSuperAdmin();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMyOnly, setFilterMyOnly] = useState(!superAdmin);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getReservations();
      setReservations(data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const years = useMemo(() => {
    const s = new Set(reservations.map((r) => r.checkin?.slice(0, 4)).filter(Boolean));
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [reservations]);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.guest_name.toLowerCase().includes(q) ||
        r.guest_phone.includes(q) ||
        r.property_name.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q);
      const month = r.checkin?.slice(5, 7);
      const year = r.checkin?.slice(0, 4);
      const matchMonth = filterMonth === "all" || month === filterMonth;
      const matchYear = filterYear === "all" || year === filterYear;
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const matchAdmin = !filterMyOnly || r.admin_name?.toLowerCase() === adminName.toLowerCase();
      return matchSearch && matchMonth && matchYear && matchStatus && matchAdmin;
    });
  }, [reservations, search, filterMonth, filterYear, filterStatus, filterMyOnly, adminName]);

  function openCreate() {
    setSelected(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openView(r: Reservation) {
    setSelected(r);
    setModalMode("view");
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      const res = await deleteReservation(id);
      if (!res.ok) throw new Error("Gagal hapus");
      toast({ title: "Dihapus", description: "Reservasi berhasil dihapus" });
      setModalOpen(false);
      load();
    } catch {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
    }
    setDeleteId(null);
  }

  function handleExportCSV() {
    const rows = filtered.map((r) => ({
      ID: r.id,
      Tamu: r.guest_name,
      HP: r.guest_phone,
      Properti: r.property_name,
      Checkin: r.checkin,
      Checkout: r.checkout,
      "Total (Rp)": r.total_price,
      "DP (Rp)": r.dp,
      Asal: r.address,
      Peserta: r.people,
      Kendaraan: r.vehicles,
      Status: r.status,
      Catatan: r.note,
    }));
    exportToCSV(rows as Record<string, unknown>[], `reservasi_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.csv`);
  }

  function handleExportPDF() {
    const rows = filtered.map((r) => ({
      Tamu: r.guest_name,
      HP: r.guest_phone,
      Properti: r.property_name,
      Checkin: r.checkin,
      Checkout: r.checkout,
      Total: formatRupiah(r.total_price),
      DP: formatRupiah(r.dp),
      Status: getStatusLabel(r.status),
    }));
    exportToPDF(rows as Record<string, unknown>[], "reservasi.pdf", "Laporan Reservasi Villa");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Bookings</h1>
          <p className="text-slate-400 text-sm">
            {filtered.length} dari {reservations.length} reservasi
            {filterMyOnly && <span className="ml-1 text-blue-400">· {adminName}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={load}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 h-8 px-2.5"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-500 text-white h-8 px-3"
            data-testid="button-tambah"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Tambah
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tamu, properti..."
            className="bg-slate-800 border-slate-600 text-white text-sm h-8 pl-8"
            data-testid="input-search"
          />
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-8 w-32">
            <SelectValue placeholder="Bulan" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">Semua bulan</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1).padStart(2, "0")} className="text-white">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-8 w-24">
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">Semua</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y} className="text-white">{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-8 w-28">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">Semua</SelectItem>
            <SelectItem value="pending" className="text-white">Pending</SelectItem>
            <SelectItem value="lunas" className="text-white">Lunas</SelectItem>
            <SelectItem value="cancel" className="text-white">Cancel</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFilterMyOnly((v) => !v)}
          className={`h-8 px-3 text-xs border transition-colors ${
            filterMyOnly
              ? "bg-blue-600 border-blue-500 text-white hover:bg-blue-500"
              : "border-slate-600 text-slate-300 hover:bg-slate-800"
          }`}
          data-testid="button-filter-my"
          title={filterMyOnly ? `Filter: hanya booking saya (${adminName})` : "Tampilkan semua booking"}
        >
          <User className="w-3.5 h-3.5 mr-1" />
          {filterMyOnly ? "Hanya saya" : "Semua admin"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCSV}
          className="border-slate-600 text-slate-300 hover:bg-slate-800 h-8 px-3 text-xs"
          data-testid="button-export-csv"
        >
          <FileDown className="w-3.5 h-3.5 mr-1" />
          CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportPDF}
          className="border-slate-600 text-slate-300 hover:bg-slate-800 h-8 px-3 text-xs"
          data-testid="button-export-pdf"
        >
          <FileDown className="w-3.5 h-3.5 mr-1" />
          PDF
        </Button>
      </div>

      {/* Loading / empty */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          Tidak ada data reservasi
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.map((r) => (
              <div
                key={r.id}
                data-testid={`row-booking-${r.id}`}
                onClick={() => openView(r)}
                className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 cursor-pointer active:bg-slate-700/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{r.guest_name}</p>
                    <p className="text-slate-500 text-xs">{r.guest_phone}</p>
                  </div>
                  <Badge className={`${getStatusColor(r.status)} border text-xs px-2 py-0.5 shrink-0`}>
                    {getStatusLabel(r.status)}
                  </Badge>
                </div>
                <p className="text-slate-300 text-xs font-medium truncate mb-1">{r.property_name}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{formatDate(r.checkin)} → {formatDate(r.checkout)}</span>
                  <span className="text-slate-300 font-medium">{formatRupiah(r.total_price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700 bg-slate-800/80">
                    <th className="text-left px-4 py-3 font-medium">Tamu</th>
                    <th className="text-left px-4 py-3 font-medium">Properti</th>
                    <th className="text-left px-4 py-3 font-medium">Checkin</th>
                    <th className="text-left px-4 py-3 font-medium">Checkout</th>
                    <th className="text-left px-4 py-3 font-medium">Total</th>
                    <th className="text-left px-4 py-3 font-medium">DP</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      data-testid={`row-booking-${r.id}`}
                      className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer transition-colors"
                      onClick={() => openView(r)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{r.guest_name}</p>
                        <p className="text-slate-500 text-xs">{r.guest_phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300">{r.property_name}</p>
                        <p className="text-slate-500 text-xs">{r.address}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(r.checkin)}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(r.checkout)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatRupiah(r.total_price)}</td>
                      <td className="px-4 py-3 text-slate-400">{formatRupiah(r.dp)}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${getStatusColor(r.status)} border text-xs px-2 py-0.5`}>
                          {getStatusLabel(r.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <ModalBooking
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        reservation={selected}
        mode={modalMode}
        onSuccess={load}
        onDelete={(id) => { setDeleteId(id); }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus Reservasi?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tindakan ini tidak dapat dibatalkan. Reservasi akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
