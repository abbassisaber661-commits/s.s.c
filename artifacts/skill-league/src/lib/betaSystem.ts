import { api } from './apiClient';

export const BETA_VERSION  = '0.19.0';
export const BETA_BUILD    = 'beta';
export const MAX_BETA_PLAYERS = 500;

const BETA_KEY   = 'sl_beta_access';
const INVITE_KEY = 'sl_invite_code';

export type BetaAccess = {
  granted: boolean;
  inviteCode?: string;
  grantedAt?: number;
  tier: 'early_access' | 'tester' | 'vip_tester' | 'team';
};

export function getBetaAccess(): BetaAccess {
  try {
    const raw = localStorage.getItem(BETA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { granted: false, tier: 'early_access' };
}

export function setBetaAccess(access: BetaAccess) {
  localStorage.setItem(BETA_KEY, JSON.stringify(access));
}

export function isBetaGranted(): boolean {
  return getBetaAccess().granted;
}

export async function validateInviteCode(code: string): Promise<{
  valid: boolean; tier?: string; error?: string;
}> {
  try {
    const res = await api.betaFeedback.submit({ action: 'validate_invite', code });
    return res as { valid: boolean; tier?: string };
  } catch {
    if (BUILTIN_CODES[code.toUpperCase()]) {
      const tier = BUILTIN_CODES[code.toUpperCase()];
      setBetaAccess({ granted: true, inviteCode: code, grantedAt: Date.now(), tier });
      return { valid: true, tier };
    }
    return { valid: false, error: 'offline' };
  }
}

const BUILTIN_CODES: Record<string, BetaAccess['tier']> = {
  'SKILL2025': 'early_access',
  'TESTER100': 'tester',
  'PINETWORK': 'vip_tester',
  'BETAVIP01': 'vip_tester',
  'TEAM2025':  'team',
};

export function tryBuiltinCode(code: string): BetaAccess | null {
  const tier = BUILTIN_CODES[code.toUpperCase().trim()];
  if (!tier) return null;
  const access: BetaAccess = { granted: true, inviteCode: code.toUpperCase(), grantedAt: Date.now(), tier };
  setBetaAccess(access);
  localStorage.setItem(INVITE_KEY, code.toUpperCase());
  return access;
}

export function getStoredInviteCode(): string | null {
  return localStorage.getItem(INVITE_KEY);
}

export function clearBetaAccess() {
  localStorage.removeItem(BETA_KEY);
  localStorage.removeItem(INVITE_KEY);
}

export function getBetaTierLabel(tier: BetaAccess['tier']): string {
  const labels: Record<BetaAccess['tier'], string> = {
    early_access: '🌟 وصول مبكر',
    tester:       '🧪 مختبر',
    vip_tester:   '👑 مختبر VIP',
    team:         '⚡ فريق التطوير',
  };
  return labels[tier] ?? '🌟 Beta';
}
