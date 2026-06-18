const AVATAR_KEY = 'sl_avatar_v1';

export const AVATAR_COLORS = [
  "from-violet-500 to-purple-700",
  "from-cyan-500 to-blue-700",
  "from-rose-500 to-red-700",
  "from-amber-500 to-orange-700",
  "from-emerald-500 to-green-700",
  "from-fuchsia-500 to-pink-700",
  "from-sky-500 to-indigo-700",
];

export function avatarGradient(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

export function avatarInitials(name: string): string {
  return (name || '??').slice(0, 2).toUpperCase();
}

function loadStore(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(AVATAR_KEY) || '{}'); }
  catch { return {}; }
}

export function getAvatarUrl(username: string): string | undefined {
  if (!username) return undefined;
  return loadStore()[username] || undefined;
}

export function setMyAvatar(username: string, base64: string): void {
  if (!username) return;
  const store = loadStore();
  store[username] = base64;
  localStorage.setItem(AVATAR_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent('sl:avatar-updated', { detail: { username } }));
}

export function clearMyAvatar(username: string): void {
  if (!username) return;
  const store = loadStore();
  delete store[username];
  localStorage.setItem(AVATAR_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent('sl:avatar-updated', { detail: { username } }));
}

export async function resizeAvatarToBase64(
  file: File,
  maxPx  = 240,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img   = new Image();
      img.onerror = reject;
      img.onload  = () => {
        const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w      = Math.round(img.width  * scale);
        const h      = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}
