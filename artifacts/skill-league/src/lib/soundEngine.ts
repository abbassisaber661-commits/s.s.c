// =============================
// 📁 soundEngine.ts
// =============================

type SoundKey =
  | 'correct'
  | 'wrong'
  | 'tap'
  | 'win'
  | 'lose'
  | 'streak'
  | 'countdown'
  | 'whoosh'
  | 'ambient'
  | 'clutch';

class SoundEngineClass {
  private sounds: Record<string, HTMLAudioElement> = {};

  register(key: SoundKey, path: string, volume = 0.7) {
    const audio = new Audio(path);
    audio.volume = volume;
    this.sounds[key] = audio;
  }

  play(key: SoundKey) {
    const sound = this.sounds[key];
    if (!sound) return;

    try {
      sound.currentTime = 0;
      sound.play();
    } catch {}
  }
}

export const SoundEngine = new SoundEngineClass();

// preload
SoundEngine.register('correct', '/sounds/correct.mp3', 0.8);
SoundEngine.register('wrong', '/sounds/wrong.mp3', 0.8);
SoundEngine.register('tap', '/sounds/tap.mp3', 0.5);
SoundEngine.register('whoosh', '/sounds/whoosh.mp3', 0.6);
SoundEngine.register('win', '/sounds/win.mp3', 0.9);
SoundEngine.register('lose', '/sounds/lose.mp3', 0.9);
SoundEngine.register('streak', '/sounds/streak.mp3', 0.8);
SoundEngine.register('ambient', '/sounds/ambient.mp3', 0.2);
SoundEngine.register('clutch', '/sounds/clutch.mp3', 1.0);