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

/** Correct answer — clean ascending double-ding */
export function playCorrect(): void {
  play(() => {
    tone(587, 0.10, 'sine', 0.13);
    tone(880, 0.18, 'sine', 0.16, 0.07);
    tone(1175, 0.12, 'sine', 0.10, 0.16);
  });
}

/** Wrong answer — sharp buzz-down */
export function playWrong(): void {
  play(() => {
    tone(280, 0.06, 'square', 0.14);
    tone(200, 0.22, 'sawtooth', 0.10, 0.05);
  });
}

/** 3-streak milestone — ascending triple chime */
export function playStreak3(): void {
  play(() => {
    tone(659, 0.12, 'sine', 0.14);
    tone(784, 0.12, 'sine', 0.15, 0.09);
    tone(988, 0.20, 'sine', 0.16, 0.18);
  });
}

/** 5-streak milestone — electric rising chord */
export function playStreak5(): void {
  play(() => {
    tone(659,  0.10, 'sine', 0.13);
    tone(784,  0.10, 'sine', 0.14, 0.07);
    tone(988,  0.10, 'sine', 0.15, 0.14);
    tone(1175, 0.10, 'sine', 0.15, 0.21);
    tone(1319, 0.28, 'sine', 0.17, 0.28);
  });
}

/** Perfect run (10/10) — triumphant major fanfare */
export function playPerfect(): void {
  play(() => {
    [523, 659, 784, 1047, 1319, 1047, 1319].forEach((f, i) => {
      tone(f, i === 6 ? 0.55 : 0.14, 'sine', 0.16, i * 0.1);
    });
  });
}

/** Generic streak — scales with streak count (fallback) */
export function playStreak(streakCount: number): void {
  if (streakCount >= 5) { playStreak5(); return; }
  if (streakCount >= 3) { playStreak3(); return; }
  play(() => {
    const base = Math.min(streakCount, 10);
    for (let i = 0; i < 3; i++) {
      tone(523 + base * 30 + i * 130, 0.12, 'sine', 0.12, i * 0.07);
    }
  });
}

/** Win fanfare — rising major chord */
export function playWin(): void {
  play(() => {
    tone(523,  0.28, 'sine', 0.14);
    tone(659,  0.28, 'sine', 0.14, 0.10);
    tone(784,  0.28, 'sine', 0.14, 0.20);
    tone(1047, 0.50, 'sine', 0.16, 0.30);
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

/** League promotion — triumphant 7-note melody */
export function playPromotion(): void {
  play(() => {
    const notes = [523, 659, 784, 880, 784, 1047, 1319];
    const durs  = [0.12, 0.12, 0.12, 0.12, 0.08, 0.12, 0.55];
    let t = 0;
    notes.forEach((f, i) => {
      tone(f, durs[i], 'sine', 0.17, t);
      t += durs[i] + 0.04;
    });
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

/** Soft whoosh — question appears */
export function playWhoosh(): void {
  play(() => {
    const c = getCtx();
    if (!c) return;
    const buf = c.createBuffer(1, c.sampleRate * 0.18, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.09, c.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(c.currentTime);
    src.stop(c.currentTime + 0.19);
  });
}

/** Soft snap — puzzle piece placed */
export function playPuzzleSnap(): void {
  play(() => {
    tone(800, 0.04, 'square', 0.07);
    tone(1200, 0.06, 'sine', 0.09, 0.03);
  });
}

/** Calm chime — pause break music */
export function playPauseChime(): void {
  play(() => {
    const notes = [523, 659, 784, 659, 523];
    notes.forEach((f, i) => {
      tone(f, 0.5, 'sine', 0.07, i * 0.45);
    });
  });
}
