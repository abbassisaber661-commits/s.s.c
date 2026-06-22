// =============================
// 📁 vfx.ts
// =============================

class VFXEngine {
  private listeners: Record<string, Function[]> = {};

  on(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  emit(event: string, data?: any) {
    (this.listeners[event] || []).forEach(fn => fn(data));
  }

  correct() {
    this.emit('flash', { color: 'green' });
    this.emit('shake', { intensity: 2 });
  }

  wrong() {
    this.emit('flash', { color: 'red' });
    this.emit('shake', { intensity: 5 });
  }

  streak(level: number) {
    this.emit('streak', { level });
  }

  clutch() {
    this.emit('clutch');
  }
}

export const VFX = new VFXEngine();