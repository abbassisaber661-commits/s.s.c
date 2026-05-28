export interface AvatarTheme {
  id: string;
  name: string;
  bg: string;
  text: string;
  glow: string;
}

export const AVATAR_THEMES: AvatarTheme[] = [
  { id: 'blue',    name: 'Blue',    bg: '#1A3A5C', text: '#3AB4FF', glow: '#3AB4FF44' },
  { id: 'green',   name: 'Green',   bg: '#0E3B2C', text: '#2EE87A', glow: '#2EE87A44' },
  { id: 'purple',  name: 'Purple',  bg: '#2A1A4A', text: '#B44FFF', glow: '#B44FFF44' },
  { id: 'red',     name: 'Red',     bg: '#3B1A1A', text: '#FF3A5E', glow: '#FF3A5E44' },
  { id: 'gold',    name: 'Gold',    bg: '#3A2A0A', text: '#FFD700', glow: '#FFD70044' },
  { id: 'cyan',    name: 'Cyan',    bg: '#0A2A3A', text: '#00E5FF', glow: '#00E5FF44' },
  { id: 'orange',  name: 'Orange',  bg: '#3A1E0A', text: '#FF9B3A', glow: '#FF9B3A44' },
  { id: 'pink',    name: 'Pink',    bg: '#3A0A2A', text: '#FF6B9D', glow: '#FF6B9D44' },
];

export function getThemeById(id: string): AvatarTheme {
  return AVATAR_THEMES.find(t => t.id === id) ?? AVATAR_THEMES[0];
}

export interface AvatarFrame {
  id: string;
  name: string;
  icon: string;
  style: string;
  requiresLock: boolean;
  requiresLevel: number;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
  { id: 'none',    name: 'None',       icon: '○',  style: '',                    requiresLock: false, requiresLevel: 0  },
  { id: 'basic',   name: 'Basic',      icon: '▢',  style: 'ring-2 ring-border',  requiresLock: false, requiresLevel: 5  },
  { id: 'glow',    name: 'Glow',       icon: '✦',  style: 'ring-2 ring-primary', requiresLock: false, requiresLevel: 10 },
  { id: 'gold',    name: 'Gold',       icon: '★',  style: 'ring-2 ring-yellow-400', requiresLock: false, requiresLevel: 20 },
  { id: 'vip',     name: 'VIP',        icon: '💎', style: 'ring-2 ring-cyan-400',   requiresLock: true,  requiresLevel: 0  },
  { id: 'champion',name: 'Champion',   icon: '👑', style: 'ring-2 ring-purple-400', requiresLock: true,  requiresLevel: 30 },
];

export function getAvailableFrames(level: number, piLocked: boolean): AvatarFrame[] {
  return AVATAR_FRAMES.filter(f => {
    if (f.requiresLock && !piLocked) return false;
    if (f.requiresLevel > level) return false;
    return true;
  });
}
