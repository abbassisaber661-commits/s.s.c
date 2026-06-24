export type VerificationLevel = 0 | 1 | 2;

export interface VerificationStatus {
  level: VerificationLevel;
  label: string;
  badge: string;
  color: string;
  description: string;
}

export const VERIFICATION_LEVELS: VerificationStatus[] = [
  { level: 0, label: 'Unverified', badge: '', color: '#666', description: 'Sign in with Pi to verify' },
  { level: 1, label: 'Pi Verified', badge: '✓', color: '#3AB4FF', description: 'Signed in with Pi Network' },
  { level: 2, label: 'Pro Verified', badge: '⭐', color: '#FFD700', description: 'Active Pi Lock holder — top player' },
];

export function getVerificationStatus(level: VerificationLevel): VerificationStatus {
  return VERIFICATION_LEVELS[level] ?? VERIFICATION_LEVELS[0];
}

export function canGetPiVerified(hasPiUser: boolean): boolean {
  return hasPiUser;
}

export function canGetProVerified(level: number, matchesPlayed: number, piLocked: boolean): boolean {
  return level >= 10 && matchesPlayed >= 20 && piLocked;
}

export function checkVerification(
  hasPiUser: boolean,
  playerLevel: number,
  matchesPlayed: number,
  piLocked: boolean,
  currentLevel: VerificationLevel,
): VerificationLevel {
  if (canGetProVerified(playerLevel, matchesPlayed, piLocked) && currentLevel < 2) return 2;
  if (canGetPiVerified(hasPiUser) && currentLevel < 1) return 1;
  return currentLevel;
}

export const PRO_REQUIREMENTS = {
  minLevel: 10,
  minMatches: 20,
  requiresPiLock: true,
};
