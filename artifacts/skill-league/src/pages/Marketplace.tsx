import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, ShoppingBag, Plus, Tag, Coins, Search, TrendingUp, X, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useGame } from "@/contexts/GameContext";
import { api } from "@/lib/apiClient";

interface Listing {
  id: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  itemEmoji: string;
  itemType: string;
  price: number;
  status: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = { cosmetic: "تجميلي", theme: "ثيم", frame: "إطار", trophy: "كأس" };
const DEMO_ITEMS = [
  { id: "theme_sunset",    name: "ثيم الغروب",   emoji: "🌅", type: "theme" },
  { id: "frame_gold",      name: "إطار ذهبي",    emoji: "🖼️", type: "frame" },
  { id: "trophy_champion", name: "كأس البطل",   emoji: "🏆", type: "trophy" },
  { id: "theme_neon",      name: "ثيم نيون",     emoji: "💜", type: "theme" },
  { id: "frame_diamond",   name: "إطار ماسي",    emoji: "💎", type: "frame" },
  { id: "cosmetic_crown",  name: "تاج ملكي",    emoji: "👑", type: "cosmetic" },
];

export default function Marketplace() {
  const { authUser, coins } = useGame();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showSell, setShowSell] = useState(false);
  const [sellItem, setSellItem] = useState(DEMO_ITEMS[0]);
  const [sellPrice, setSellPrice] = useState(200);
  const [buying, setBuying] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const fetchListings = () => {
    setLoading(true);
    api.marketplace.list()
      .then((d: any) => { setListings(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchListings(); }, []);

  const filtered = listings.filter(l => {
    if (filter !== "all" && l.itemType !== filter) return false;
    if (search && !l.itemName.includes(search) && !l.sellerName.includes(search)) return false;
    return true;
  });

  const handleBuy = async (l: Listing) => {
    if (!authUser?.uid) return;
    if (coins < l.price) { showToast("❌ رصيدك غير كافٍ!"); return; }
    setBuying(l.id);
    const d = await api.marketplace.buy(l.id, authUser.uid);
    setBuying(null);
    if (d.ok) { showToast("✅ تم الشراء بنجاح!"); fetchListings(); }
    else showToast("❌ حدث خطأ أثناء الشراء");
  };

  const handleSell = async () => {
    if (!authUser?.uid) return;
    const d: any = await api.marketplace.create({
      sellerId: authUser.uid, itemId: sellItem.id, itemName: sellItem.name,
      itemEmoji: sellItem.emoji, itemType: sellItem.type, price: sellPrice,
    });
    if (d?.id) { showToast("✅ تم نشر عرضك!"); setShowSell(false); fetchListings(); }
    else showToast("❌ خطأ في النشر");
  };

  const timeAgo = (s: string) => {
    const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
    if (m < 60) return `${m} د`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} س`;
    return `${Math.floor(h / 24)} يوم`;
  };

  const FILTERS = [{ id: "all", label: "الكل" }, ...Object.entries(TYPE_LABELS).map(([id, label]) => ({ id, label }))];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <Link href="/"><button className="p-2 rounded-xl hover:bg-card"><ArrowLeft size={20} /></button></Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2"><ShoppingBag size={18} className="text-purple-400" /> السوق الداخلي</h1>
            <p className="text-xs text-muted-foreground">تداول العناصر بين اللاعبين</p>
          </div>
          <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700 shrink-0" onClick={() => setShowSell(true)}>
            <Plus size={14} /> بيع
          </Button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute right-3 top-2.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن عنصر..." dir="rtl"
            className="w-full bg-card border border-border rounded-xl pr-8 pl-3 py-2 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${filter === f.id ? "bg-purple-600 text-white" : "bg-card text-muted-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-32 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl px-6 py-3 text-sm font-semibold shadow-xl whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4">
        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><TrendingUp size={12} /> {filtered.length} عنصر متاح</span>
          <span className="flex items-center gap-1"><Coins size={12} className="text-amber-400" /> رصيدك: {coins.toLocaleString()} 🪙</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">🛒</div>
            <div className="text-muted-foreground">لا توجد عناصر متاحة حالياً</div>
            <Button variant="outline" onClick={() => setShowSell(true)} className="gap-2">
              <Plus size={14} /> كن أول من يبيع
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((l, i) => (
              <motion.div key={l.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-2xl p-3 flex flex-col gap-2 hover:border-purple-500/50 transition-colors">
                <div className="text-4xl text-center py-3 bg-muted/30 rounded-xl">{l.itemEmoji}</div>
                <div className="font-semibold text-sm text-center leading-tight">{l.itemName}</div>
                <div className="text-xs text-muted-foreground text-center">{l.sellerName}</div>
                <div className="text-xs text-muted-foreground text-center opacity-60">{TYPE_LABELS[l.itemType] || l.itemType} · {timeAgo(l.createdAt)}</div>
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="flex items-center gap-1 text-amber-400 font-bold text-sm"><Coins size={12} />{l.price.toLocaleString()}</span>
                  <Button size="sm" disabled={buying === l.id || l.sellerId === authUser?.uid}
                    onClick={() => handleBuy(l)}
                    className="text-xs h-7 px-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50">
                    {buying === l.id ? "..." : l.sellerId === authUser?.uid ? "عرضك" : "شراء"}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Sell Modal */}
      <AnimatePresence>
        {showSell && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowSell(false); }}>
            <motion.div initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-card border border-border rounded-3xl p-6 w-full max-w-md space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg flex items-center gap-2"><Package size={18} className="text-purple-400" /> عرض عنصر للبيع</h2>
                <button onClick={() => setShowSell(false)} className="p-1 rounded-lg hover:bg-muted"><X size={18} /></button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">اختر العنصر</label>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_ITEMS.map(item => (
                    <button key={item.id} onClick={() => setSellItem(item)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${sellItem.id === item.id ? "border-purple-500 bg-purple-500/10" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                      <div className="text-2xl">{item.emoji}</div>
                      <div className="text-xs mt-1 text-muted-foreground truncate">{item.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">السعر بالعملات</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={10} max={9999} value={sellPrice} onChange={e => setSellPrice(Number(e.target.value))}
                    className="flex-1 accent-purple-500" />
                  <span className="font-bold text-amber-400 text-sm w-20 text-right tabular-nums">{sellPrice.toLocaleString()} 🪙</span>
                </div>
              </div>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 gap-2 h-12" onClick={handleSell}>
                <Tag size={16} /> نشر العرض
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
