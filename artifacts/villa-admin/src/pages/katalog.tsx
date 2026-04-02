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
} from "lucide-react";

type Tab = { key: CatalogEndpoint; label: string; icon: React.ElementType; color: string };

const TABS: Tab[] = [
  { key: "properties", label: "Properties", icon: Building2, color: "blue" },
  { key: "trips",      label: "Trips",      icon: MapPin,         color: "emerald" },
  { key: "catering",   label: "Catering",   icon: UtensilsCrossed, color: "orange" },
  { key: "outbound",   label: "Outbound",   icon: Bike,           color: "violet" },
];

type ArrayField = "facilities" | "menu" | "activities" | "destinations" | "notes";

interface FieldDef {
  key: keyof CatalogItem;
  label: string;
  type?: "text" | "number" | "url" | "array";
  placeholder?: string;
}

const FIELDS: Record<CatalogEndpoint, FieldDef[]> = {
  properties: [
    { key: "name",       label: "Nama",      placeholder: "Nama properti" },
    { key: "location",   label: "Lokasi",    placeholder: "Lokasi properti" },
    { key: "price",      label: "Harga",     type: "number", placeholder: "Harga per malam" },
    { key: "image",      label: "URL Gambar",type: "url",    placeholder: "https://..." },
    { key: "facilities", label: "Fasilitas", type: "array",  placeholder: "Tambah fasilitas..." },
  ],
  trips: [
    { key: "name",         label: "Nama",       placeholder: "Nama trip" },
    { key: "category",     label: "Kategori",   placeholder: "Contoh: Adventure" },
    { key: "price",        label: "Harga",      type: "number", placeholder: "Harga per orang" },
    { key: "destinations", label: "Destinasi",  type: "array",  placeholder: "Tambah destinasi..." },
    { key: "facilities",   label: "Fasilitas",  type: "array",  placeholder: "Tambah fasilitas..." },
    { key: "notes",        label: "Catatan",    type: "array",  placeholder: "Tambah catatan..." },
  ],
  catering: [
    { key: "name",        label: "Nama",      placeholder: "Nama paket catering" },
    { key: "category",    label: "Kategori",  placeholder: "Contoh: Prasmanan" },
    { key: "price",       label: "Harga",     type: "number", placeholder: "Harga per porsi/paket" },
    { key: "description", label: "Deskripsi", placeholder: "Deskripsi singkat" },
    { key: "menu",        label: "Menu",      type: "array",  placeholder: "Tambah menu..." },
  ],
  outbound: [
    { key: "name",       label: "Nama",      placeholder: "Nama paket outbound" },
    { key: "category",   label: "Kategori",  placeholder: "Contoh: Team Building" },
    { key: "price",      label: "Harga",     type: "number", placeholder: "Harga per orang" },
    { key: "duration",   label: "Durasi",    placeholder: "Contoh: 2 jam" },
    { key: "activities", label: "Aktivitas", type: "array",  placeholder: "Tambah aktivitas..." },
    { key: "facilities", label: "Fasilitas", type: "array",  placeholder: "Tambah fasilitas..." },
  ],
};

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  function add() {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="bg-slate-800 border-slate-600 text-white text-sm h-8"
        />
        <Button
          type="button"
          size="sm"
          onClick={add}
          className="bg-slate-700 hover:bg-slate-600 text-white h-8 px-3 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span
              key={i}
              className="flex items-center gap-1 bg-slate-700 text-slate-300 text-xs rounded-full px-2.5 py-0.5"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogModal({
  open,
  onClose,
  endpoint,
  item,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  endpoint: CatalogEndpoint;
  item: CatalogItem | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CatalogItem>>({});

  useEffect(() => {
    if (open) {
      setForm(item ? { ...item } : {});
    }
  }, [open, item]);

  function setField(key: keyof CatalogItem, value: string | number | string[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let res: Response;
      if (item) {
        res = await updateCatalog(endpoint, { ...form, id: item.id } as CatalogItem);
      } else {
        res = await createCatalog(endpoint, form);
      }
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

  const fields = FIELDS[endpoint];
  const tab = TABS.find((t) => t.key === endpoint)!;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {item ? "Edit" : "Tambah"} {tab.label}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {fields.map((field) => (
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
                    setField(
                      field.key,
                      field.type === "number" ? Number(e.target.value) : e.target.value
                    )
                  }
                  placeholder={field.placeholder}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 h-9"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white h-9"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : item ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemCard({
  item,
  endpoint,
  onEdit,
  onDelete,
}: {
  item: CatalogItem;
  endpoint: CatalogEndpoint;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const arrayBadgeField: ArrayField | null =
    endpoint === "properties" || endpoint === "trips" || endpoint === "outbound"
      ? "facilities"
      : endpoint === "catering"
      ? "menu"
      : null;

  const subField =
    endpoint === "trips"
      ? item.category
      : endpoint === "catering"
      ? item.category
      : endpoint === "outbound"
      ? item.category
      : endpoint === "properties"
      ? item.location
      : null;

  const extraField =
    endpoint === "outbound" ? item.duration : null;

  const arrayItems: string[] =
    arrayBadgeField && item[arrayBadgeField]
      ? (item[arrayBadgeField] as string[])
      : [];

  return (
    <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden hover:border-slate-600/60 transition-all">
      {item.image && (
        <div className="aspect-video bg-slate-700 overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      {!item.image && endpoint === "properties" && (
        <div className="aspect-video bg-slate-700/50 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-slate-600" />
        </div>
      )}
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{item.name}</p>
            {subField && (
              <p className="text-slate-400 text-xs truncate mt-0.5">{subField}</p>
            )}
          </div>
          {item.price != null && (
            <span className="text-blue-400 font-semibold text-xs shrink-0">
              {formatRupiah(item.price)}
            </span>
          )}
        </div>

        {extraField && (
          <p className="text-slate-500 text-xs">⏱ {extraField}</p>
        )}

        {item.description && (
          <p className="text-slate-400 text-xs line-clamp-2">{item.description}</p>
        )}

        {arrayItems.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {arrayItems.slice(0, 4).map((f, i) => (
              <Badge
                key={i}
                className="bg-slate-700 text-slate-300 border-slate-600 text-[10px] font-normal px-1.5"
              >
                {f}
              </Badge>
            ))}
            {arrayItems.length > 4 && (
              <Badge className="bg-slate-700 text-slate-400 border-slate-600 text-[10px] font-normal px-1.5">
                +{arrayItems.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-1.5 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 h-7 text-xs"
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="border-red-600/40 text-red-400 hover:bg-red-500/10 h-7 px-2.5"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KatalogPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CatalogEndpoint>("properties");
  const [data, setData] = useState<Record<CatalogEndpoint, CatalogItem[]>>({
    properties: [],
    trips: [],
    catering: [],
    outbound: [],
  });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CatalogItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (ep: CatalogEndpoint = activeTab) => {
      setLoading(true);
      try {
        const result = await getCatalog(ep);
        setData((prev) => ({ ...prev, [ep]: result }));
      } catch {
        toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [activeTab, toast]
  );

  useEffect(() => {
    if (data[activeTab].length === 0) {
      load(activeTab);
    }
  }, [activeTab]);

  function handleAdd() {
    setEditItem(null);
    setModalOpen(true);
  }

  function handleEdit(item: CatalogItem) {
    setEditItem(item);
    setModalOpen(true);
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
      toast({ title: "Error", description: "Gagal menghapus data", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteItem(null);
    }
  }

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const items = data[activeTab];

  const tabColorClass: Record<string, string> = {
    blue:   "bg-blue-600 text-white",
    emerald:"bg-emerald-600 text-white",
    orange: "bg-orange-600 text-white",
    violet: "bg-violet-600 text-white",
  };
  const tabInactiveClass = "text-slate-400 hover:text-white hover:bg-slate-800";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Katalog</h1>
          <p className="text-slate-400 text-sm">{items.length} item · {currentTab.label}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => load(activeTab)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 h-8 px-2.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-500 text-white h-8 px-3"
          >
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
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                active ? tabColorClass[tab.color] : tabInactiveClass
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

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
            <Button
              size="sm"
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Tambah Pertama
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              endpoint={activeTab}
              onEdit={() => handleEdit(item)}
              onDelete={() => setDeleteItem(item)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <CatalogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
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
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
