export interface VIPTier {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  glowColor: string;
  piCost: number;
  coinBonus: number;
  xpBonus: number;
  durationDays: number;
  perks: string[];
  perksAr: string[];
  badge: string;
  frameId: string;
  priority: number;
}

export const VIP_TIERS: VIPTier[] = [
  {
    id: 'vip_bronze',
    name: 'VIP Bronze',
    nameAr: 'VIP برونزي',
    icon: '🥉',
    color: '#cd7f32',
    glowColor: '#cd7f3230',
    piCost: 5,
    coinBonus: 15,
    xpBonus: 10,
    durationDays: 30,
    badge: '🥉',
    frameId: 'vip_bronze',
    perks: ['15% bonus DN$ per match', '10% XP boost', 'VIP Bronze badge', 'Bronze exclusive frame', 'Priority matchmaking'],
    perksAr: ['15% DN$ إضافية لكل مباراة', 'تعزيز XP بنسبة 10%', 'شارة VIP برونزية', 'إطار برونزي حصري', 'أولوية في المباريات'],
    priority: 1,
  },
  {
    id: 'vip_silver',
    name: 'VIP Silver',
    nameAr: 'VIP فضي',
    icon: '🥈',
    color: '#94a3b8',
    glowColor: '#94a3b830',
    piCost: 15,
    coinBonus: 25,
    xpBonus: 20,
    durationDays: 30,
    badge: '🥈',
    frameId: 'vip_silver',
    perks: ['25% bonus DN$ per match', '20% XP boost', 'VIP Silver badge', 'Silver exclusive frame', 'Priority matchmaking', 'Access to VIP Loot Boxes'],
    perksAr: ['25% DN$ إضافية لكل مباراة', 'تعزيز XP بنسبة 20%', 'شارة VIP فضية', 'إطار فضي حصري', 'أولوية في المباريات', 'الوصول لصناديق VIP'],
    priority: 2,
  },
  {
    id: 'vip_gold',
    name: 'VIP Gold',
    nameAr: 'VIP ذهبي',
    icon: '👑',
    color: '#f59e0b',
    glowColor: '#f59e0b30',
    piCost: 30,
    coinBonus: 40,
    xpBonus: 35,
    durationDays: 30,
    badge: '👑',
    frameId: 'vip_gold',
    perks: ['40% bonus DN$ per match', '35% XP boost', 'VIP Gold crown badge', 'Gold exclusive frame', 'Priority matchmaking', 'VIP Loot Boxes', 'VIP-only tournaments', 'Exclusive avatar themes', 'Monthly special rewards'],
    perksAr: ['40% DN$ إضافية لكل مباراة', 'تعزيز XP بنسبة 35%', 'شارة تاج VIP الذهبية', 'إطار ذهبي حصري', 'أولوية في المباريات', 'صناديق VIP', 'بطولات VIP حصرية', 'ثيمات أفاتار حصرية', 'مكافآت خاصة شهرية'],
    priority: 3,
  },
  {
    id: 'vip_diamond',
    name: 'VIP Diamond',
    nameAr: 'VIP ألماسي',
    icon: '💎',
    color: '#06b6d4',
    glowColor: '#06b6d430',
    piCost: 60,
    coinBonus: 60,
    xpBonus: 50,
    durationDays: 30,
    badge: '💎',
    frameId: 'vip_diamond',
    perks: ['60% bonus DN$ per match', '50% XP boost', 'Diamond VIP badge', 'Legendary diamond frame', 'Instant matchmaking', 'VIP Loot Boxes x2/week', 'VIP-only tournaments + early access', 'All exclusive avatar themes', 'Weekly special rewards', 'Social VIP status (visible to all)'],
    perksAr: ['60% DN$ إضافية لكل مباراة', 'تعزيز XP بنسبة 50%', 'شارة VIP ألماسية', 'إطار ألماسي أسطوري', 'مطابقة فورية', 'صناديق VIP × 2 أسبوعياً', 'بطولات VIP + وصول مبكر', 'جميع ثيمات الأفاتار الحصرية', 'مكافآت خاصة أسبوعية', 'حالة VIP الاجتماعية (مرئية للجميع)'],
    priority: 4,
  },
];

const VIP_KEY = 'skill_league_vip';

export interface VIPData {
  tierId: string | null;
  expiresAt: number | null;
  activatedAt: number | null;
  totalPiSpent: number;
}

export function getVIPData(): VIPData {
  try { return JSON.parse(localStorage.getItem(VIP_KEY) || 'null') ?? { tierId: null, expiresAt: null, activatedAt: null, totalPiSpent: 0 }; }
  catch { return { tierId: null, expiresAt: null, activatedAt: null, totalPiSpent: 0 }; }
}

export function saveVIPData(data: VIPData) {
  localStorage.setItem(VIP_KEY, JSON.stringify(data));
}

export function getActiveVIPTier(): VIPTier | null {
  const data = getVIPData();
  if (!data.tierId || !data.expiresAt || data.expiresAt < Date.now()) return null;
  return VIP_TIERS.find(t => t.id === data.tierId) ?? null;
}

export function isVIPActive(): boolean {
  return getActiveVIPTier() !== null;
}

export function getVIPExpiry(): number | null {
  const data = getVIPData();
  if (!data.expiresAt || data.expiresAt < Date.now()) return null;
  return data.expiresAt;
}

export function activateVIP(tierId: string): boolean {
  const tier = VIP_TIERS.find(t => t.id === tierId);
  if (!tier) return false;
  const existing = getVIPData();
  const now = Date.now();
  const base = existing.expiresAt && existing.expiresAt > now ? existing.expiresAt : now;
  saveVIPData({
    tierId,
    expiresAt: base + tier.durationDays * 86400000,
    activatedAt: now,
    totalPiSpent: (existing.totalPiSpent || 0) + tier.piCost,
  });
  return true;
}
