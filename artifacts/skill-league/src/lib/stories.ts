import { api, getStoredPlayerId, type ApiStory } from "./apiClient";

// ─── الأنواع (Types) ─────────────────────────────────
export interface StoryReply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  likes?: Record<string, true>;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorLevel: number;
  emoji: string;
  content: string;
  imageUrl?: string;
  timestamp: number;
  views: number;
  reactions?: Record<string, string>;
  replies?: StoryReply[];
}

// ─── الثوابت والتخزين المحلي ──────────────────────────
const STORIES_KEY = "sl_stories_v1";
const STORY_TTL = 24 * 60 * 60 * 1000;

// ─── دوال مساعدة ──────────────────────────────────────

// ✅ التعديل 1: mapApiStory محدّث
function mapApiStory(s: any): Story {
  return {
    id: s.id,
    authorId: s.authorId || "",
    authorName: s.authorName,
    authorLevel: s.authorLevel,
    emoji: s.emoji,
    content: s.content,
    imageUrl: s.imageUrl ?? undefined,
    timestamp: new Date(s.createdAt || s.expiresAt || Date.now()).getTime(),
    views: s.views ?? 0,

    // 🔥 مهم: دعم backend الجديد
    reactions: s.reactions || {},
    replies: Array.isArray(s.replies) ? s.replies : [],
  };
}

function loadStoriesLocal(): Story[] {
  try {
    return JSON.parse(localStorage.getItem(STORIES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveStoriesLocal(stories: Story[]) {
  try {
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  } catch {}
}

// ─── جلب الستوريات ────────────────────────────────────
export async function getStoriesAsync(): Promise<Story[]> {
  try {
    const apiStories = await api.stories.list(50);
    const mapped = apiStories.map(mapApiStory).sort((a, b) => b.timestamp - a.timestamp);
    saveStoriesLocal(mapped);
    return mapped.length > 0 ? mapped : getSeedStories();
  } catch {
    return getStoriesLocal();
  }
}

export function getStoriesLocal(): Story[] {
  const now = Date.now();
  const all = loadStoriesLocal();
  const live = all.filter((s) => now - s.timestamp < STORY_TTL);
  if (live.length < all.length) saveStoriesLocal(live);
  return live.length > 0 ? live.sort((a, b) => b.timestamp - a.timestamp) : getSeedStories();
}

export function getStories(): Story[] {
  return getStoriesLocal();
}

// ─── جلب ستوري واحد (للردود والمشاهدات) ──────────────
export async function getStoryAsync(id: string): Promise<Story> {
  const res = await fetch(`/api/stories/${id}`);
  if (!res.ok) throw new Error("Failed to fetch story");
  const data = await res.json();
  return {
    ...data,
    replies: data.replies || [],
    reactions: data.reactions || {},
  };
}

// ─── إنشاء ستوري ──────────────────────────────────────
export async function addStoryAsync(
  authorName: string,
  authorLevel: number,
  content: string,
  emoji: string,
  imageUrl?: string,
): Promise<Story[]> {
  const authorId = getStoredPlayerId() ?? authorName;
  try {
    await api.stories.create({
      authorId,
      authorName,
      authorLevel,
      emoji,
      content: content || (imageUrl ? "📸" : ""),
      imageUrl: imageUrl ?? undefined,
    });
    return await getStoriesAsync();
  } catch {
    return addStoryLocal(authorName, authorLevel, content, emoji, imageUrl);
  }
}

export function addStory(
  authorName: string,
  authorLevel: number,
  content: string,
  emoji: string,
  imageUrl?: string,
): Story[] {
  return addStoryLocal(authorName, authorLevel, content, emoji, imageUrl);
}

function addStoryLocal(
  authorName: string,
  authorLevel: number,
  content: string,
  emoji: string,
  imageUrl?: string,
): Story[] {
  const story: Story = {
    id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    authorId: getStoredPlayerId() ?? authorName,
    authorName,
    authorLevel,
    emoji,
    content: (content || (imageUrl ? "📸" : "")).trim().slice(0, 120),
    imageUrl: imageUrl || undefined,
    timestamp: Date.now(),
    views: 0,
    reactions: {},
    replies: [],
  };
  const stories = loadStoriesLocal();
  saveStoriesLocal([story, ...stories].slice(0, 50));
  return getStoriesLocal();
}

// ─── تسجيل مشاهدة ──────────────────────────────────────

// ✅ التعديل 2: viewStoryAsync محدّث
export async function viewStoryAsync(id: string): Promise<void> {
  const userId = getStoredPlayerId() ?? "anonymous";

  api.stories
    .view(id)
    .catch(() => {});

  const stories = loadStoriesLocal();
  saveStoriesLocal(
    stories.map((s) =>
      s.id === id ? { ...s, views: (s.views || 0) + 1 } : s
    )
  );
}

// ✅ التعديل 3: viewStory محدّث
export function viewStory(id: string): void {
  const userId = getStoredPlayerId() ?? "anonymous";
  void userId;

  api.stories
    .view(id)
    .catch(() => {});

  const stories = loadStoriesLocal();
  saveStoriesLocal(
    stories.map((s) =>
      s.id === id ? { ...s, views: (s.views || 0) + 1 } : s
    )
  );
}

// ─── إرسال رد ──────────────────────────────────────────
export async function replyStoryAsync(
  storyId: string,
  data: { userId: string; userName: string; text: string },
): Promise<any> {
  const res = await fetch(`/api/stories/${storyId}/reply`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to reply");
  }
  return res.json();
}

// ─── إعجاب على رد ──────────────────────────────────────
export async function likeReplyAsync(
  storyId: string,
  replyId: string,
  userId: string,
): Promise<any> {
  const res = await fetch(`/api/stories/${storyId}/replies/${replyId}/like`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to like reply");
  }
  return res.json();
}

// ─── بذور (Seed) للاختبار ──────────────────────────────
function getSeedStories(): Story[] {
  const now = Date.now();
  return [
    {
      id: "st_1",
      authorId: "seed_1",
      authorName: "QuantumBolt77",
      authorLevel: 34,
      emoji: "⚡",
      content: "Tournament mode is insane today — who wants to run a set?",
      timestamp: now - 2 * 3600_000,
      views: 42,
      reactions: {},
      replies: [],
    },
    {
      id: "st_2",
      authorId: "seed_2",
      authorName: "SwiftHawk99",
      authorLevel: 52,
      emoji: "🦅",
      content: "Hit Level 52 last night 🔥 grind never stops",
      timestamp: now - 4 * 3600_000,
      views: 87,
      reactions: {},
      replies: [],
    },
    {
      id: "st_3",
      authorId: "seed_3",
      authorName: "NeonArrow42",
      authorLevel: 28,
      emoji: "🎯",
      content: "PvP streak = 7 wins straight. Challenge me if you dare 😈",
      timestamp: now - 6 * 3600_000,
      views: 31,
      reactions: {},
      replies: [],
    },
    {
      id: "st_4",
      authorId: "seed_4",
      authorName: "IronMind55",
      authorLevel: 15,
      emoji: "🧠",
      content: "Memory mode training session done. Accuracy up to 92% 💪",
      timestamp: now - 10 * 3600_000,
      views: 19,
      reactions: {},
      replies: [],
    },
    {
      id: "st_5",
      authorId: "seed_5",
      authorName: "StarFox21",
      authorLevel: 8,
      emoji: "🌟",
      content: "New player here! Any tips for reaction mode?",
      timestamp: now - 14 * 3600_000,
      views: 8,
      reactions: {},
      replies: [],
    },
  ];
}

// ─── ضغط الصور ──────────────────────────────────────────
export async function resizeImageToBase64(
  file: File,
  maxPx = 600,
  quality = 0.75,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Real-time subscriptions stub ──────────────────────────────────────────────
export function subscribeToStories(
  _onNew: (story: Story) => void,
  _onDelete: (id: string) => void
): () => void {
  return () => {};
}