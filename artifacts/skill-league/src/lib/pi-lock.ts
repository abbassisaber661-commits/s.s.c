export interface PiLockTier {
  id: string;
  name: string;
  piAmount: number;
  durationDays: number;
  icon: string;
  color: string;
  benefits: string[];
  coinBonus: number;
  xpBonus: number;
}

export const PI_LOCK_TIERS: PiLockTier[] = [
  {
    id: 'starter',
    name: 'Starter Lock',
    piAmount: 1,
    durationDays: 7,
    icon: '🔒',
    color: '#3AB4FF',
    benefits: [
      '✓ Pi Verified badge',
      '✓ +10% coin rewards for 7 days',
      '✓ Free tournament entry ×1',
      '✓ Community post priority',
    ],
    coinBonus: 10,
    xpBonus: 0,
  },
  {
    id: 'player',
    name: 'Player Lock',
    piAmount: 5,
    durationDays: 30,
    icon: '🔐',
    color: '#FFD700',
    benefits: [
      '✓ Pro Verified badge ⭐',
      '✓ +20% coin rewards for 30 days',
      '✓ +10% XP boost for 30 days',
      '✓ VIP tournament access',
      '✓ Boosted community visibility',
      '✓ Exclusive player frame',
    ],
    coinBonus: 20,
    xpBonus: 10,
  },
  {
    id: 'champion',
    name: 'Champion Lock',
    piAmount: 20,
    durationDays: 90,
    icon: '👑',
    color: '#B44FFF',
    benefits: [
      '✓ Pro Verified badge ⭐',
      '✓ +35% coin rewards for 90 days',
      '✓ +25% XP boost for 90 days',
      '✓ Unlimited VIP tournament access',
      '✓ Champion player frame',
      '✓ Priority matchmaking',
      '✓ Name appears in leaderboard highlight',
    ],
    coinBonus: 35,
    xpBonus: 25,
  },
];

export function getActiveLockTier(
  piLockTierId: string | null,
  piLockExpiry: number | null,
): PiLockTier | null {
  if (!piLockTierId || !piLockExpiry) return null;
  if (Date.now() > piLockExpiry) return null;
  return PI_LOCK_TIERS.find(t => t.id === piLockTierId) ?? null;
}

export function getLockTimeLeft(piLockExpiry: number | null): string {
  if (!piLockExpiry || Date.now() > piLockExpiry) return 'Expired';
  const diff = piLockExpiry - Date.now();
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export function formatPi(amount: number): string {
  return `π ${amount.toFixed(1)}`;
}
