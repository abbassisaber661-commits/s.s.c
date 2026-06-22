// =============================
// 📁 hooks/useMatchVFX.ts
// =============================

import { useEffect, useState } from 'react';
import { VFX } from '@/lib/vfx';

export function useMatchVFX() {
  const [flash, setFlash] = useState<'green' | 'red' | null>(null);
  const [shake, setShake] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    VFX.on('flash', ({ color }: any) => {
      setFlash(color);
      setTimeout(() => setFlash(null), 300);
    });

    VFX.on('shake', () => {
      setShake(true);
      setTimeout(() => setShake(false), 300);
    });

    VFX.on('streak', ({ level }: any) => {
      setStreak(level);
      setTimeout(() => setStreak(null), 1200);
    });
  }, []);

  return { flash, shake, streak };
}