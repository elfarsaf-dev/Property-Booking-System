import { useState, useEffect, useCallback } from "react";
import {
  getCatalog,
  createCatalog,
  updateCatalog,
  deleteCatalog,
  type CatalogItem,
  type CatalogEndpoint,
} from "@/services/api";
import { formatRupiah } from "@/utils/helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Building2,
  MapPin,
  UtensilsCrossed,
  Bike,
  X,
  Image as ImageIcon,
  Users,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react";

type Tab = { key: CatalogEndpoint; label: string; icon: React.ElementType; color: string };

const TABS: Tab[] = [
  { key: "properties", label: "Properties", icon: Building2,       color: "blue" },
  { key: "trips",      label: "Trips",      icon: MapPin,          color: "emerald" },
  { key: "catering",   label: "Catering",   icon: UtensilsCrossed, color: "orange" },
  { key: "outbound",   label: "Outbound",   icon: Bike,            color: "violet" },
];

const TAB_ACTIVE: Record<string, string> = {
  blue:    "bg-blue-600 text-white",
  emerald: "bg-emerald-600 text-white",
  orange:  "bg-orange-600 text-white",
  violet:  "bg-violet-600 text-white",
};

type ArrayField = "facilities" | "menu" | "activities" | "destinations" | "notes";

interface FieldDef {
  key: keyof CatalogItem;
  label: string;
  type?: "text" | "number" | "url" | "array";
  placeholder?: string;
}

const FIELDS: Record<CatalogEndpoint, FieldDef[]> = {
  properties: [
    { key: "name",       label: "Nama",       placeholder: "Nama properti" },
    { key: "location",   label: "Lokasi",     placeholder: "Lokasi properti" },
    { key: "type",       label: "Tipe",       placeholder: "villa / glamping" },
    { key: "price",      label: "Harga",      type: "number", placeholder: "Harga dasar" },
    { key: "capacity",   label: "Kapasitas",  placeholder: "Contoh: 20 orang" },
    { key: "image",      label: "URL Gambar", type: "url", placeholder: "https://..." },
    { key: "facilities", label: "Fasilitas",  type: "array", placeholder: "Tambah fasilitas..." },
    { key: "notes",      label: "Peraturan",  type: "array", placeholder: "Tambah peraturan..." },
  ],
  trips: [
    { key: "name",         label: "Nama",       placeholder: "Nama trip" },
    { key: "category",     label: "Kategori",   placeholder: "Contoh: Adventure" },
    { key: "price",        label: "Harga",      type: "number", placeholder: "Harga per orang" },
    { key: "destinations", label: "Destinasi",  type: "array", placeholder: "Tambah destinasi..." },
    { key: "facilities",   label: "Fasilitas",  type: "array", placeholder: "Tambah fasilitas..." },
    { key: "notes",        label: "Catatan",    type: "array", placeholder: "Tambah catatan..." },
  ],
  catering: [
    { key: "name",        label: "Nama",       placeholder: "Nama paket catering" },
    { key: "category",    label: "Kategori",   placeholder: "Contoh: Prasmanan" },
    { key: "price",       label: "Harga",      type: "number", placeholder: "Harga per porsi/paket" },
    { key: "description", label: "Deskripsi",  placeholder: "Deskripsi singkat" },
    { key: "menu",        label: "Menu",       type: "array", placeholder: "Tambah menu..." },
  ],
  outbound: [
    { key: "name",       label: "Nama",       placeholder: "Nama paket outbound" },
    { key: "category",   label: "Kategori",   placeholder: "Contoh: Team Building" },
    { key: "price",      label: "Harga",      type: "number", placeholder: "Harga per orang" },
    { key: "duration",   label: "Durasi",     placeholder: "Contoh: 2 jam" },
    { key: "activities", label: "Aktivitas",  type: "array", placeholder: "Tambah aktivitas..." },
    { key: "facilities", label: "Fasilitas",  type: "array", placeholder: "Tambah fasilitas..." },
  ],
};

/* ─── Tag Input ─── */
function TagInput({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  function add() {
    const t = input.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setInput("");
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="bg-slate-800 border-slate-600 text-white text-sm h-8" />
        <Button type="button" size="sm" onClick={add}
          className="bg-slate-700 hover:bg-slate-600 text-white h-8 px-3 shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span key={i} className="flex items-center gap-1 bg-slate-700 text-slate-300 text-xs rounded-full px-2.5 py-0.5">
              {v}
              <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-slate-500 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Image Gallery ─── */
function ImageGallery({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  return (
    <div>
      <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden mb-2">
        <img src={images[idx]} alt="" className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        {images.length > 1 && (
          <>
            <button onClick={() => setIdx((c) => (c - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setIdx((c) => (c + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {idx + 1}/{images.length}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {images.slice(0, 8).map((img, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${i === idx ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Detail Modal ─── */
function DetailModal({ item, endpoint, open, onClose, onEdit, onDelete }: {
  item: CatalogItem; endpoint: CatalogEndpoint; open: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const allImages = [item.image, ...(item.slide_images || [])].filter(Boolean) as string[];
  const tab = TABS.find((t) => t.key === endpoint)!;

  const typeColor = item.type === "villa"
    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
    : item.type === "glamping"
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : "bg-slate-700 text-slate-400 border-slate-600";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-white text-lg">{item.name}</DialogTitle>
              {item.location && (
                <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {item.location}
                </div>
              )}
            </div>
            {item.type && (
              <Badge className={`border text-xs shrink-0 capitalize ${typeColor}`}>{item.type}</Badge>
            )}
            {item.category && !item.type && (
              <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-xs shrink-0">{item.category}</Badge>
            )}
          </div>
        </DialogHeader>

        {/* Gallery */}
        {allImages.length > 0 && <ImageGallery images={allImages} />}

        {/* Meta info */}
        <div className="space-y-4">
          {item.capacity && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Users className="w-4 h-4" />
              Kapasitas: <span className="text-white">{item.capacity}</span>
              {item.units != null && (
                <span className="text-slate-500">· {item.units} unit</span>
              )}
            </div>
          )}

          {item.duration && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span>⏱</span> Durasi: <span className="text-white">{item.duration}</span>
            </div>
          )}

          {item.description && (
            <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
          )}

          {/* Rates (properties) */}
          {item.rates && item.rates.length > 0 && (
            <div>
              <h4 className="text-white font-medium text-sm mb-2">Harga per Malam</h4>
              <div className="space-y-1.5">
                {item.rates.map((r, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-2 text-sm">
                    <span className="text-slate-300">{r.label}</span>
                    <span className="text-white font-semibold">{formatRupiah(r.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flat price (trips, catering, outbound) */}
          {item.price != null && !item.rates?.length && (
            <div className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">Harga:</span>
              <span className="text-white font-semibold text-base">{formatRupiah(item.price)}</span>
            </div>
          )}

          {/* Array fields */}
          {(["destinations", "activities", "menu", "facilities", "notes"] as ArrayField[]).map((field) => {
            const arr = item[field];
            if (!arr || !arr.length) return null;
            const labels: Record<ArrayField, string> = {
              destinations: "Destinasi",
              activities:   "Aktivitas",
              menu:         "Menu",
              facilities:   "Fasilitas",
              notes:        "Peraturan",
            };
            const isNotes = field === "notes";
            return (
              <div key={field}>
                <h4 className="text-white font-medium text-sm mb-2">{labels[field]}</h4>
                {isNotes ? (
                  <ul className="space-y-1">
                    {arr.map((v, i) => (
                      <li key={i} className="text-slate-400 text-sm flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5 shrink-0">•</span>{v}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {arr.map((v, i) => (
                      <Badge key={i} className="bg-slate-700 text-slate-300 border-slate-600 text-xs font-normal">{v}</Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <Button onClick={onEdit}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-9">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <Button onClick={onDelete} variant="outline"
            className="border-red-600/40 text-red-400 hover:bg-red-500/10 h-9 px-3">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Form Modal ─── */
function CatalogModal({ open, onClose, endpoint, item, onSuccess }: {
  open: boolean; onClose: () => void; endpoint: CatalogEndpoint;
  item: CatalogItem | null; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CatalogItem>>({});

  useEffect(() => {
    if (open) setForm(item ? { ...item } : {});
  }, [open, item]);

  function setField(key: keyof CatalogItem, value: string | number | string[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = item
        ? await updateCatalog(endpoint, { ...form, id: item.id } as CatalogItem)
        : await createCatalog(endpoint, form);
      if (!res.ok) throw new Error();
      toast({ title: item ? "Diperbarui" : "Ditambahkan", description: "Data berhasil disimpan" });
      onSuccess();
      onClose();
    } catch {
      toast({ title: "Error", description: "Gagal menyimpan data", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const tab = TABS.find((t) => t.key === endpoint)!;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{item ? "Edit" : "Tambah"} {tab.label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {FIELDS[endpoint].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-slate-400 text-xs font-medium">{field.label}</label>
              {field.type === "array" ? (
                <TagInput
                  values={(form[field.key] as string[]) || []}
                  onChange={(v) => setField(field.key, v)}
                  placeholder={field.placeholder}
                />
              ) : (
                <Input
                  type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
                  value={(form[field.key] as string | number) ?? ""}
                  onChange={(e) =>
                    setField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)
                  }
                  placeholder={field.placeholder}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 h-9">Batal</Button>
            <Button type="submit" disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white h-9">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : item ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Item Card ─── */
function ItemCard({ item, endpoint, onClick }: {
  item: CatalogItem; endpoint: CatalogEndpoint; onClick: () => void;
}) {
  const mainPrice = item.rates?.length
    ? Math.min(...item.rates.map((r) => r.price))
    : item.price;

  const sub =
    endpoint === "properties" ? item.location :
    endpoint === "trips"      ? item.category :
    endpoint === "catering"   ? item.category :
    endpoint === "outbound"   ? item.category : null;

  const arrField: ArrayField | null =
    endpoint === "catering"   ? "menu" :
    endpoint === "trips"      ? "destinations" :
    endpoint === "outbound"   ? "activities" :
    "facilities";

  const arrItems: string[] = (arrField && item[arrField]) ? (item[arrField] as string[]) : [];

  const typeColor =
    item.type === "villa"    ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
    item.type === "glamping" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
    "bg-slate-700 text-slate-300 border-slate-600";

  return (
    <Card
      className="bg-slate-800/60 border-slate-700/50 overflow-hidden hover:border-slate-500/50 transition-all cursor-pointer group"
      onClick={onClick}
    >
      {item.image ? (
        <div className="aspect-video bg-slate-700 overflow-hidden">
          <img src={item.image} alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.innerHTML = ""; }} />
        </div>
      ) : endpoint === "properties" ? (
        <div className="aspect-video bg-slate-700/40 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-slate-600" />
        </div>
      ) : null}

      <CardContent className="p-3 space-y-2">
        {/* Name + type badge */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-white font-semibold text-sm leading-tight flex-1 min-w-0 truncate">{item.name}</p>
          {item.type && (
            <Badge className={`border text-[10px] shrink-0 capitalize px-1.5 ${typeColor}`}>{item.type}</Badge>
          )}
        </div>

        {/* Sub info */}
        {sub && <p className="text-slate-400 text-xs truncate">{sub}</p>}

        {/* Duration */}
        {item.duration && <p className="text-slate-500 text-xs">⏱ {item.duration}</p>}

        {/* Description */}
        {item.description && !sub && (
          <p className="text-slate-400 text-xs line-clamp-2">{item.description}</p>
        )}

        {/* Price highlight */}
        {mainPrice != null && (
          <div className="flex items-baseline gap-1">
            <span className="text-slate-500 text-[10px]">
              {item.rates?.length ? "mulai" : ""}
            </span>
            <span className="text-blue-400 font-bold text-sm">{formatRupiah(mainPrice)}</span>
            {item.rates?.length ? (
              <span className="text-slate-500 text-[10px]">/ malam</span>
            ) : null}
          </div>
        )}

        {/* Array badges */}
        {arrItems.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {arrItems.slice(0, 3).map((f, i) => (
              <Badge key={i} className="bg-slate-700 text-slate-300 border-slate-600 text-[10px] font-normal px-1.5">{f}</Badge>
            ))}
            {arrItems.length > 3 && (
              <Badge className="bg-slate-700/60 text-slate-500 border-slate-700 text-[10px] font-normal px-1.5">+{arrItems.length - 3}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ─── */
export default function KatalogPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CatalogEndpoint>("properties");
  const [data, setData] = useState<Record<CatalogEndpoint, CatalogItem[]>>({
    properties: [], trips: [], catering: [], outbound: [],
  });
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [detailItem, setDetailItem]  = useState<CatalogItem | null>(null);
  const [editItem,   setEditItem]    = useState<CatalogItem | null>(null);
  const [formOpen,   setFormOpen]    = useState(false);
  const [deleteItem, setDeleteItem]  = useState<CatalogItem | null>(null);
  const [deleting,   setDeleting]    = useState(false);

  const load = useCallback(async (ep: CatalogEndpoint) => {
    setLoading(true);
    try {
      const result = await getCatalog(ep);
      setData((prev) => ({ ...prev, [ep]: result }));
    } catch {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (data[activeTab].length === 0) load(activeTab);
    setTypeFilter("all");
  }, [activeTab]);

  function openAdd() { setEditItem(null); setFormOpen(true); }
  function openEdit(item: CatalogItem) {
    setDetailItem(null);
    setEditItem(item);
    setFormOpen(true);
  }
  function openDelete(item: CatalogItem) {
    setDetailItem(null);
    setDeleteItem(item);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await deleteCatalog(activeTab, deleteItem.id);
      if (!res.ok) throw new Error();
      toast({ title: "Dihapus", description: "Data berhasil dihapus" });
      setData((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab].filter((i) => i.id !== deleteItem.id),
      }));
    } catch {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteItem(null);
    }
  }

  const rawItems = data[activeTab];

  const items = activeTab === "properties" && typeFilter !== "all"
    ? rawItems.filter((p) => (p.type || "").toLowerCase() === typeFilter)
    : rawItems;

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Katalog</h1>
          <p className="text-slate-400 text-sm">{items.length} item · {currentTab.label}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => load(activeTab)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 h-8 px-2.5">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-500 text-white h-8 px-3">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Tambah
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 bg-slate-800/50 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                active ? TAB_ACTIVE[tab.color] : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Properties type filter */}
      {activeTab === "properties" && (
        <div className="flex gap-2">
          {["all", "villa", "glamping"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize border ${
                typeFilter === t
                  ? t === "villa"    ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                  : t === "glamping" ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40"
                  : "bg-slate-700 text-white border-slate-600"
                  : "text-slate-500 border-slate-700 hover:text-slate-300 hover:border-slate-600"
              }`}>
              {t === "all" ? "Semua" : t}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm">
          <currentTab.icon className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          Belum ada data {currentTab.label}
          <div className="mt-3">
            <Button size="sm" onClick={openAdd} className="bg-blue-600 hover:bg-blue-500 text-white">
              <Plus className="w-3.5 h-3.5 mr-1" />Tambah Pertama
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} endpoint={activeTab}
              onClick={() => setDetailItem(item)} />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <DetailModal
          open={!!detailItem}
          item={detailItem}
          endpoint={activeTab}
          onClose={() => setDetailItem(null)}
          onEdit={() => openEdit(detailItem)}
          onDelete={() => openDelete(detailItem)}
        />
      )}

      {/* Add/Edit Form Modal */}
      <CatalogModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        endpoint={activeTab}
        item={editItem}
        onSuccess={() => load(activeTab)}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus Data?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              <strong className="text-slate-300">{deleteItem?.name}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
