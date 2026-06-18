export type StoreItemType = 'coins' | 'xp_boost' | 'cosmetic' | 'entry_pass';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: StoreItemType;
  piPrice: number;
  coinValue?: number;
  xpBoostHours?: number;
  oneTimePurchase: boolean;
  badge?: string;
}

export const STORE_ITEMS: StoreItem[] = [
  {
    id: 'coins_100',
    name: '100 Coins',
    description: 'A quick top-up to keep playing',
    icon: '💰',
    type: 'coins',
    piPrice: 0.1,
    coinValue: 100,
    oneTimePurchase: false,
  },
  {
    id: 'coins_500',
    name: '500 Coins',
    description: 'Best value for casual players',
    icon: '💎',
    type: 'coins',
    piPrice: 0.4,
    coinValue: 500,
    oneTimePurchase: false,
    badge: 'Popular',
  },
  {
    id: 'coins_1500',
    name: '1500 Coins',
    description: 'Power player pack — maximum value',
    icon: '🏆',
    type: 'coins',
    piPrice: 1.0,
    coinValue: 1500,
    oneTimePurchase: false,
    badge: 'Best Value',
  },
  {
    id: 'xp_boost_24h',
    name: 'XP Boost ×2',
    description: 'Double XP for 24 hours',
    icon: '⚡',
    type: 'xp_boost',
    piPrice: 0.5,
    xpBoostHours: 24,
    oneTimePurchase: false,
  },
  {
    id: 'xp_boost_72h',
    name: 'XP Boost ×2 (3 days)',
    description: 'Double XP for 72 hours',
    icon: '🚀',
    type: 'xp_boost',
    piPrice: 1.0,
    xpBoostHours: 72,
    oneTimePurchase: false,
  },
  {
    id: 'vip_avatar',
    name: 'VIP Avatar Frame',
    description: 'Golden frame on your profile forever',
    icon: '👑',
    type: 'cosmetic',
    piPrice: 0.8,
    oneTimePurchase: true,
  },
  {
    id: 'elite_pass',
    name: 'Elite Season Pass',
    description: 'Unlock Elite league access forever + 10% coin bonus',
    icon: '🌟',
    type: 'entry_pass',
    piPrice: 1.5,
    oneTimePurchase: true,
    badge: 'Exclusive',
  },
];

export function formatPiPrice(pi: number): string {
  return `π ${pi.toFixed(1)}`;
}

export function isOwned(itemId: string, ownedItems: string[]): boolean {
  return ownedItems.includes(itemId);
}
