export type ContentTab = "posts" | "reels" | "saved";

export const CONTENT_TABS: { id: ContentTab; label: string; icon: string }[] = [
  { id: "posts",  label: "Posts",  icon: "📝" },
  { id: "reels",  label: "Reels",  icon: "🎬" },
  { id: "saved",  label: "Saved",  icon: "🔖" },
];
