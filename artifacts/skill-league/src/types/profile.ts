export interface Post {
  id: string;
  type: "text" | "image" | "reel";
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  likes: number;
  comments: number;
  isSaved?: boolean;
  timestamp: number;
  authorName: string;
  authorLevel: number;
}

export type VerificationTier = "none" | "verified" | "premium" | "partner" | "staff";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  earnedAt?: number;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

export interface AvatarFrame {
  id: string;
  name: string;
  imageUrl: string;
  isPremium?: boolean;
}

export interface ProfileTheme {
  id: string;
  name: string;
  gradient?: string;
  isPremium?: boolean;
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  twitch?: string;
  tiktok?: string;
  website?: string;
}

export interface ProfileData {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  country?: string;
  countryCode?: string;
  joinedAt?: number;
  level: number;
  league?: string;
  leagueIcon?: string;
  postsCount: number;
  reelsCount?: number;
  savedCount?: number;
  mediaCount?: number;
  followers: number;
  following: number;
  friends?: number;
  totalLikes?: number;
  isFollowing?: boolean;
  isFriend?: boolean;
  isOwner?: boolean;
  verification?: VerificationTier;
  achievements?: Achievement[];
  avatarFrame?: AvatarFrame;
  profileTheme?: ProfileTheme;
  fullName?: string;
  website?: string;
  socialLinks?: SocialLinks;
}

export type ContentTab = "posts" | "media" | "reels" | "saved";
