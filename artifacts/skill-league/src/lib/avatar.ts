const AVATAR_KEY = "sl_avatar_v1";

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
  if (!name) return AVATAR_COLORS[0];

  return AVATAR_COLORS[
    name.charCodeAt(0) % AVATAR_COLORS.length
  ];
}

export function avatarInitials(name: string): string {
  if (!name) return "?";

  const words = name.trim().split(" ");

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return words[0].slice(0, 2).toUpperCase();
}

function loadStore(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(AVATAR_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getAvatarUrl(username: string): string | undefined {
  if (!username) return undefined;

  const store = loadStore();

  return store[username];
}

export function setMyAvatar(
  username: string,
  base64: string
): void {
  if (!username || !base64) return;

  const store = loadStore();

  store[username] = base64;

  localStorage.setItem(
    AVATAR_KEY,
    JSON.stringify(store)
  );

  window.dispatchEvent(
    new CustomEvent("sl:avatar-updated", {
      detail: { username },
    })
  );
}

export function clearMyAvatar(
  username: string
): void {
  const store = loadStore();

  delete store[username];

  localStorage.setItem(
    AVATAR_KEY,
    JSON.stringify(store)
  );

  window.dispatchEvent(
    new CustomEvent("sl:avatar-updated", {
      detail: { username },
    })
  );
}

export async function resizeAvatarToBase64(
  file: File,
  maxPx = 300,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;

    reader.onload = () => {
      const img = new Image();

      img.onerror = reject;

      img.onload = () => {
        const scale = Math.min(
          1,
          maxPx / Math.max(img.width, img.height)
        );

        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        resolve(
          canvas.toDataURL(
            "image/jpeg",
            quality
          )
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}