// ─────────────────────────────────────────────
// 🛒 SkillLeague Shop Items
// ─────────────────────────────────────────────

import type { ShopItem } from "@/lib/economy-engine";

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "bronze_badge",
    name: "Bronze Badge",
    price: 100,
    currency: "coins",
  },

  {
    id: "silver_badge",
    name: "Silver Badge",
    price: 300,
    currency: "coins",
  },

  {
    id: "gold_badge",
    name: "Gold Badge",
    price: 750,
    currency: "coins",
  },

  {
    id: "diamond_badge",
    name: "Diamond Badge",
    price: 10,
    currency: "gems",
  },

  {
    id: "legend_title",
    name: "Legend Title",
    price: 25,
    currency: "gems",
  },
];