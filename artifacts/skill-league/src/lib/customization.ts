export interface AvatarFace {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  glow: string;
  vip: boolean;
}

export const AVATAR_FACES: AvatarFace[] = [
  // ── Free ────────────────────────────────────────────────────────────────────
  { id: 'f1',  name: 'شاب',        emoji: '👦', bg: 'linear-gradient(135deg,#1A3A5C,#0D2137)', glow: '#3AB4FF', vip: false },
  { id: 'f2',  name: 'فتاة',       emoji: '👧', bg: 'linear-gradient(135deg,#3A0A2A,#1E0515)', glow: '#FF6B9D', vip: false },
  { id: 'f3',  name: 'شباب',       emoji: '🧑', bg: 'linear-gradient(135deg,#0E3B2C,#071F17)', glow: '#2EE87A', vip: false },
  { id: 'f4',  name: 'مرح',        emoji: '😎', bg: 'linear-gradient(135deg,#0A2A3A,#061520)', glow: '#00E5FF', vip: false },
  { id: 'f5',  name: 'امرأة',      emoji: '👩', bg: 'linear-gradient(135deg,#2A1A4A,#1A0E2E)', glow: '#B44FFF', vip: false },
  { id: 'f6',  name: 'رجل',        emoji: '👨', bg: 'linear-gradient(135deg,#1E3A1A,#0F1E0D)', glow: '#4ADE80', vip: false },
  { id: 'f7',  name: 'ملتحي',      emoji: '🧔', bg: 'linear-gradient(135deg,#3A1E0A,#1E0F05)', glow: '#FF9B3A', vip: false },
  { id: 'f8',  name: 'جعدة',       emoji: '👩‍🦱', bg: 'linear-gradient(135deg,#3B1A1A,#210E0E)', glow: '#FF3A5E', vip: false },
  { id: 'f9',  name: 'أشقر',       emoji: '👱', bg: 'linear-gradient(135deg,#3A2A0A,#1E1505)', glow: '#FDE047', vip: false },
  { id: 'f10', name: 'شقراء',      emoji: '👱‍♀️', bg: 'linear-gradient(135deg,#2A1A0A,#150D05)', glow: '#FBBF24', vip: false },
  { id: 'f11', name: 'حكيم',       emoji: '👴', bg: 'linear-gradient(135deg,#1E1E2A,#111118)', glow: '#94A3B8', vip: false },
  { id: 'f12', name: 'ناضجة',      emoji: '👵', bg: 'linear-gradient(135deg,#2A1A2A,#150E15)', glow: '#C084FC', vip: false },
  // ── VIP ─────────────────────────────────────────────────────────────────────
  { id: 'v1',  name: 'أسطورة',     emoji: '🤵', bg: 'linear-gradient(135deg,#1C1404,#3D2B00)', glow: '#FFD700', vip: true },
  { id: 'v2',  name: 'أميرة',      emoji: '👸', bg: 'linear-gradient(135deg,#2D0A4E,#1A0530)', glow: '#E879F9', vip: true },
  { id: 'v3',  name: 'بطل',        emoji: '🦸‍♂️', bg: 'linear-gradient(135deg,#0A1F3D,#03102B)', glow: '#60A5FA', vip: true },
  { id: 'v4',  name: 'بطلة',       emoji: '🦸‍♀️', bg: 'linear-gradient(135deg,#3D0A0A,#2B0303)', glow: '#F87171', vip: true },
  { id: 'v5',  name: 'ساحر',       emoji: '🧙‍♂️', bg: 'linear-gradient(135deg,#1A0A2E,#0D0316)', glow: '#A78BFA', vip: true },
  { id: 'v6',  name: 'أمير',       emoji: '🤴', bg: 'linear-gradient(135deg,#2D1800,#1A0E00)', glow: '#F59E0B', vip: true },
  { id: 'v7',  name: 'نينجا',      emoji: '🥷', bg: 'linear-gradient(135deg,#0A0A0A,#1C1C1C)', glow: '#64748B', vip: true },
  { id: 'v8',  name: 'خيال',       emoji: '🧝‍♀️', bg: 'linear-gradient(135deg,#042A1A,#021510)', glow: '#34D399', vip: true },
];

export const FREE_FACES  = AVATAR_FACES.filter(f => !f.vip);
export const VIP_FACES   = AVATAR_FACES.filter(f =>  f.vip);

export function getAvatarById(id: string): AvatarFace {
  return AVATAR_FACES.find(f => f.id === id) ?? FREE_FACES[0];
}

// ── Kept for backwards-compat (AvatarFrame system) ──────────────────────────

export interface AvatarFrame {
  id: string;
  name: string;
  icon: string;
  style: string;
  requiresLock: boolean;
  requiresLevel: number;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
  { id: 'none',     name: 'None',     icon: '○',  style: '',                        requiresLock: false, requiresLevel: 0  },
  { id: 'basic',    name: 'Basic',    icon: '▢',  style: 'ring-2 ring-border',      requiresLock: false, requiresLevel: 5  },
  { id: 'glow',     name: 'Glow',     icon: '✦',  style: 'ring-2 ring-primary',     requiresLock: false, requiresLevel: 10 },
  { id: 'gold',     name: 'Gold',     icon: '★',  style: 'ring-2 ring-yellow-400',  requiresLock: false, requiresLevel: 20 },
  { id: 'vip',      name: 'VIP',      icon: '💎', style: 'ring-2 ring-cyan-400',    requiresLock: true,  requiresLevel: 0  },
  { id: 'champion', name: 'Champion', icon: '👑', style: 'ring-2 ring-purple-400',  requiresLock: true,  requiresLevel: 30 },
];

export function getAvailableFrames(level: number, piLocked: boolean): AvatarFrame[] {
  return AVATAR_FRAMES.filter(f => {
    if (f.requiresLock && !piLocked) return false;
    if (f.requiresLevel > level) return false;
    return true;
  });
}
