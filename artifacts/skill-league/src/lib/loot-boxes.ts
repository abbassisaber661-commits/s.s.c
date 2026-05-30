export interface LootItem {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  type: 'coins' | 'xp' | 'frame' | 'avatar' | 'title_badge' | 'pi_reward';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  value?: number;
  frameId?: string;
  color: string;
  weight: number;
}

export interface LootBox {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  descriptionAr: string;
  type: 'free' | 'seasonal' | 'vip' | 'win';
  cost: number;
  costType: 'free' | 'coins' | 'pi';
  color: string;
  glowColor: string;
  items: LootItem[];
  availableCount?: number;
  nextFreeAt?: string;
}

export interface LootBoxResult {
  item: LootItem;
  isNew: boolean;
}

// Phase 20: Anti-inflation balancing — reduced max coin rewards from boxes,
// increased XP weight to shift value away from pure coin accumulation.
const COMMON_ITEMS: LootItem[] = [
  { id: 'coins_30',   name: '30 Coins',   nameAr: '30 عملة',   icon: '🪙', type: 'coins', rarity: 'common',  color: '#fbbf24', value: 30,  weight: 40 },
  { id: 'coins_75',   name: '75 Coins',   nameAr: '75 عملة',   icon: '💰', type: 'coins', rarity: 'common',  color: '#fbbf24', value: 75,  weight: 25 },
  { id: 'xp_250',     name: '+250 XP',    nameAr: '+250 XP',   icon: '⚡', type: 'xp',    rarity: 'common',  color: '#a78bfa', value: 250, weight: 22 },
  { id: 'coins_150',  name: '150 Coins',  nameAr: '150 عملة',  icon: '💎', type: 'coins', rarity: 'rare',    color: '#60a5fa', value: 150, weight: 8  },
  { id: 'xp_600',     name: '+600 XP',    nameAr: '+600 XP',   icon: '🌟', type: 'xp',    rarity: 'rare',    color: '#f472b6', value: 600, weight: 4  },
  { id: 'coins_500',  name: '500 Coins',  nameAr: '500 عملة',  icon: '👑', type: 'coins', rarity: 'epic',    color: '#8b5cf6', value: 500, weight: 1  },
];

// Phase 20: Seasonal box adds cosmetics with strict legendary cap
const SEASONAL_ITEMS: LootItem[] = [
  ...COMMON_ITEMS,
  { id: 'frame_gold',     name: 'Gold Frame',     nameAr: 'إطار ذهبي',       icon: '🖼️', type: 'frame',  rarity: 'epic',      color: '#f59e0b', weight: 4,  frameId: 'gold' },
  { id: 'frame_diamond',  name: 'Diamond Frame',  nameAr: 'إطار ألماسي',     icon: '💎', type: 'frame',  rarity: 'legendary', color: '#06b6d4', weight: 1,  frameId: 'diamond' },
  { id: 'coins_1200',     name: '1200 Coins',     nameAr: '1200 عملة',       icon: '🏆', type: 'coins',  rarity: 'legendary', color: '#f59e0b', value: 1200,weight: 1 },
];

// Phase 20: VIP boxes shift value to cosmetics (frames) over raw coins
const VIP_ITEMS: LootItem[] = [
  { id: 'coins_300',      name: '300 Coins',      nameAr: '300 عملة',        icon: '💰', type: 'coins',  rarity: 'rare',      color: '#fbbf24', value: 300, weight: 25 },
  { id: 'xp_1000',        name: '+1000 XP',       nameAr: '+1000 XP',        icon: '⚡', type: 'xp',     rarity: 'rare',      color: '#a78bfa', value: 1000,weight: 28 },
  { id: 'coins_800',      name: '800 Coins',      nameAr: '800 عملة',        icon: '💎', type: 'coins',  rarity: 'epic',      color: '#8b5cf6', value: 800, weight: 18 },
  { id: 'frame_vip',      name: 'VIP Frame',      nameAr: 'إطار VIP',        icon: '👑', type: 'frame',  rarity: 'epic',      color: '#f59e0b', weight: 20, frameId: 'vip' },
  { id: 'coins_1500',     name: '1500 Coins',     nameAr: '1500 عملة',       icon: '🏆', type: 'coins',  rarity: 'legendary', color: '#f59e0b', value: 1500,weight: 7  },
  { id: 'frame_legendary',name: 'Legend Frame',   nameAr: 'إطار الأسطورة',   icon: '🌟', type: 'frame',  rarity: 'legendary', color: '#06b6d4', weight: 2,  frameId: 'legendary' },
];

export const LOOT_BOXES: LootBox[] = [
  {
    id: 'free_daily',
    name: 'Daily Box',
    nameAr: 'صندوق يومي',
    icon: '🎁',
    description: 'Free daily reward box',
    descriptionAr: 'صندوق مكافأة يومي مجاني',
    type: 'free',
    cost: 0,
    costType: 'free',
    color: '#10b981',
    glowColor: '#10b98133',
    items: COMMON_ITEMS,
  },
  {
    id: 'seasonal',
    name: 'Season Box',
    nameAr: 'صندوق الموسم',
    icon: '🌟',
    description: 'Rare seasonal items and big coin rewards',
    descriptionAr: 'عناصر موسمية نادرة ومكافآت عملات ضخمة',
    type: 'seasonal',
    cost: 500,
    costType: 'coins',
    color: '#8b5cf6',
    glowColor: '#8b5cf633',
    items: SEASONAL_ITEMS,
  },
  {
    id: 'vip_box',
    name: 'VIP Box',
    nameAr: 'صندوق VIP',
    icon: '👑',
    description: 'Exclusive VIP rewards and legendary items',
    descriptionAr: 'مكافآت VIP حصرية وعناصر أسطورية',
    type: 'vip',
    cost: 1000,
    costType: 'coins',
    color: '#f59e0b',
    glowColor: '#f59e0b33',
    items: VIP_ITEMS,
  },
  {
    id: 'win_box',
    name: 'Victory Box',
    nameAr: 'صندوق النصر',
    icon: '🏆',
    description: 'Earned after tournament victories',
    descriptionAr: 'يُكسب بعد الفوز في البطولات',
    type: 'win',
    cost: 0,
    costType: 'free',
    color: '#f97316',
    glowColor: '#f9731633',
    items: SEASONAL_ITEMS,
  },
];

function weightedRandom(items: LootItem[]): LootItem {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let rand = Math.random() * total;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return items[items.length - 1];
}

export function openLootBox(box: LootBox): LootItem {
  return weightedRandom(box.items);
}

const OPENED_KEY = 'skill_league_loot_opened';
const DAILY_BOX_KEY = 'skill_league_daily_box_ts';

export interface OpenedData {
  [boxId: string]: number;
}

export function getOpenedData(): OpenedData {
  try { return JSON.parse(localStorage.getItem(OPENED_KEY) || '{}'); } catch { return {}; }
}

export function markBoxOpened(boxId: string) {
  const data = getOpenedData();
  data[boxId] = Date.now();
  localStorage.setItem(OPENED_KEY, JSON.stringify(data));
}

export function canOpenDailyBox(): boolean {
  const ts = parseInt(localStorage.getItem(DAILY_BOX_KEY) || '0');
  const now = Date.now();
  const today = new Date().toDateString();
  const lastDay = new Date(ts).toDateString();
  return today !== lastDay;
}

export function markDailyBoxOpened() {
  localStorage.setItem(DAILY_BOX_KEY, String(Date.now()));
}

export const RARITY_COLORS = {
  common:    '#94a3b8',
  rare:      '#3b82f6',
  epic:      '#8b5cf6',
  legendary: '#f59e0b',
};

export const RARITY_LABELS = {
  en: { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' },
  ar: { common: 'عادي',   rare: 'نادر',  epic: 'ملحمي', legendary: 'أسطوري'  },
};
