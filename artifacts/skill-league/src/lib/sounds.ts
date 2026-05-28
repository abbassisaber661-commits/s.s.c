// Web Audio API sound engine — no external files needed
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.18,
  startDelay = 0,
): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const vol = c.createGain();
  osc.connect(vol);
  vol.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + startDelay);
  vol.gain.setValueAtTime(0, c.currentTime + startDelay);
  vol.gain.linearRampToValueAtTime(gain, c.currentTime + startDelay + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + duration);
  osc.start(c.currentTime + startDelay);
  osc.stop(c.currentTime + startDelay + duration + 0.01);
}

function isMuted(): boolean {
  try {
    const d = localStorage.getItem('player_data');
    if (d) {
      const p = JSON.parse(d);
      return p.soundEnabled === false;
    }
  } catch { /* ignore */ }
  return false;
}

function play(fn: () => void): void {
  if (isMuted()) return;
  fn();
}

/** Short satisfying tap click */
export function playTap(): void {
  play(() => tone(660, 0.08, 'square', 0.08));
}

/** Correct answer — ascending ding */
export function playCorrect(): void {
  play(() => {
    tone(523, 0.12, 'sine', 0.15);
    tone(784, 0.15, 'sine', 0.15, 0.08);
  });
}

/** Wrong answer — descending buzz */
export function playWrong(): void {
  play(() => {
    tone(220, 0.08, 'square', 0.12);
    tone(165, 0.18, 'square', 0.10, 0.06);
  });
}

/** Streak milestone — sparkle effect */
export function playStreak(streakCount: number): void {
  play(() => {
    const base = Math.min(streakCount, 10);
    for (let i = 0; i < 3; i++) {
      tone(523 + base * 30 + i * 130, 0.12, 'sine', 0.12, i * 0.07);
    }
  });
}

/** Win fanfare — rising chord */
export function playWin(): void {
  play(() => {
    tone(523, 0.3,  'sine', 0.14);
    tone(659, 0.3,  'sine', 0.14, 0.1);
    tone(784, 0.3,  'sine', 0.14, 0.2);
    tone(1047, 0.5, 'sine', 0.16, 0.3);
  });
}

/** Lose sound — descending minor */
export function playLose(): void {
  play(() => {
    tone(440, 0.2, 'sine', 0.14);
    tone(349, 0.2, 'sine', 0.14, 0.15);
    tone(262, 0.4, 'sine', 0.14, 0.3);
  });
}

/** Level up — triumphant jingle */
export function playLevelUp(): void {
  play(() => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      tone(f, 0.18, 'sine', 0.16, i * 0.09);
    });
  });
}

/** Achievement unlock — magical shimmer */
export function playAchievement(): void {
  play(() => {
    [784, 988, 1175, 1319].forEach((f, i) => {
      tone(f, 0.14, 'sine', 0.13, i * 0.06);
    });
  });
}

/** Countdown tick */
export function playTick(urgent = false): void {
  play(() => tone(urgent ? 880 : 440, 0.05, 'square', 0.08));
}

/** Match start — 3-2-1 beep */
export function playCountdown(): void {
  play(() => tone(660, 0.12, 'sine', 0.14));
}

/** PvP match found */
export function playMatchFound(): void {
  play(() => {
    tone(440, 0.12, 'sine', 0.15);
    tone(660, 0.12, 'sine', 0.15, 0.13);
    tone(880, 0.25, 'sine', 0.18, 0.26);
  });
}

/** Coin earned */
export function playCoin(): void {
  play(() => {
    tone(1047, 0.06, 'sine', 0.12);
    tone(1319, 0.12, 'sine', 0.12, 0.06);
  });
}
