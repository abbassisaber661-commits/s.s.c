export type SocialListType = "followers" | "following" | "friends";

export type ContentTab =
  | "posts"
  | "reels"
  | "saved";

export interface TabConfig {
  id: ContentTab;
  labelKey: string;
  icon?: string;
}

export const CONTENT_TABS: readonly TabConfig[] = [
  {
    id: "posts",
    labelKey: "profilePage.tabs.posts",
    icon: "Grid3X3",
  },
  {
    id: "reels",
    labelKey: "profilePage.tabs.reels",
    icon: "Clapperboard",
  },
  {
    id: "saved",
    labelKey: "profilePage.tabs.saved",
    icon: "Bookmark",
  },
] as const;