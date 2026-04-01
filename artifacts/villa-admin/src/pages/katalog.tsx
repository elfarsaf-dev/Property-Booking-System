import { useState, useEffect } from "react";
import { getProperties, type Property } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Users, Building2, Tent, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatRupiah } from "@/utils/helpers";

function ImageGallery({ images, main }: { images: string[]; main: string }) {
  const [current, setCurrent] = useState(0);
  const all = [main, ...images].filter(Boolean);

  return (
    <div>
      <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden mb-2">
        <img
          src={all[current]}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
        />
        {all.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((c) => (c - 1 + all.length) % all.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrent((c) => (c + 1) % all.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {current + 1}/{all.length}
            </div>
          </>
        )}
      </div>
      {all.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {all.slice(0, 8).map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${i === current ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyCard({ property, onClick }: { property: Property; onClick: () => void }) {
  return (
    <Card
      className="bg-slate-800/60 border-slate-700/50 overflow-hidden hover:border-blue-500/40 transition-all cursor-pointer group"
      onClick={onClick}
      data-testid={`card-property-${property.id}`}
    >
      <div className="aspect-video bg-slate-700 overflow-hidden">
        {property.image ? (
          <img
            src={property.image}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-slate-600" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-white font-semibold">{property.name}</h3>
            <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
              <MapPin className="w-3 h-3" />
              {property.location}
            </div>
          </div>
          <Badge className={`text-xs ${property.type === "villa" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"}`}>
            {property.type === "villa" ? <Building2 className="w-3 h-3 mr-1 inline" /> : <Tent className="w-3 h-3 mr-1 inline" />}
            {property.type}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-xs mb-3">
          <Users className="w-3 h-3" />
          {property.capacity}
        </div>
        <div className="space-y-1">
          {property.rates?.slice(0, 2).map((rate, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-slate-400">{rate.label}</span>
              <span className="text-white font-medium">{formatRupiah(rate.price)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function KatalogPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Property | null>(null);

  useEffect(() => {
    getProperties()
      .then(setProperties)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = properties.filter((p) =>
    filter === "all" ? true : p.type === filter
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Katalog Properti</h1>
          <p className="text-slate-400 text-sm">{filtered.length} properti tersedia</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">Semua</SelectItem>
            <SelectItem value="villa" className="text-white">Villa</SelectItem>
            <SelectItem value="glamping" className="text-white">Glamping</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">Belum ada properti</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-white">{selected.name}</DialogTitle>
                  <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {selected.location}
                  </div>
                </div>
                <Badge className={`text-xs shrink-0 ${selected.type === "villa" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"}`}>
                  {selected.type}
                </Badge>
              </div>
            </DialogHeader>

            <ImageGallery images={selected.slide_images || []} main={selected.image} />

            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Users className="w-4 h-4" />
              Kapasitas: <span className="text-white">{selected.capacity}</span>
            </div>

            <div>
              <h4 className="text-white font-medium text-sm mb-2">Harga per Malam</h4>
              <div className="space-y-2">
                {selected.rates?.map((rate, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-2 text-sm">
                    <span className="text-slate-300">{rate.label}</span>
                    <span className="text-white font-semibold">{formatRupiah(rate.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {selected.facilities && (
              <div>
                <h4 className="text-white font-medium text-sm mb-2">Fasilitas</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selected.facilities.map((f, i) => (
                    <Badge key={i} className="bg-slate-700 text-slate-300 border-slate-600 text-xs font-normal">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selected.notes && selected.notes.length > 0 && (
              <div>
                <h4 className="text-white font-medium text-sm mb-2">Peraturan</h4>
                <ul className="space-y-1">
                  {selected.notes.map((note, i) => (
                    <li key={i} className="text-slate-400 text-sm flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
