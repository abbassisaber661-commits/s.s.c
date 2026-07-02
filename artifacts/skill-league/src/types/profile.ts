export interface Post {
  id: string;
  type: "text" | "image" | "reel";
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  likes: number;
  comments: number;
  isSaved?: boolean;
  isPinned?: boolean;
  timestamp: number;
  authorName: string;
  authorLevel: number;
}

export type VerificationTier =
  | "none"
  | "verified"
  | "official"
  | "premium"
  | "partner"
  | "creator"
  | "developer"
  | "moderator"
  | "ambassador"
  | "staff";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export type BadgeCategory = "role" | "social" | "achievement" | "event" | "special";

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color?: string;
  rarity?: BadgeRarity;
  category?: BadgeCategory;
  earnedAt?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  earnedAt?: number;
  rarity?: BadgeRarity;
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

export type PrivacyVisibility = "everyone" | "friends" | "followers" | "nobody";

export interface PrivacyConfig {
  isPrivate: boolean;
  whoCanFollow: PrivacyVisibility;
  whoCanMessage: PrivacyVisibility;
  whoCanSeeFriends: PrivacyVisibility;
  whoCanSeeFollowers: PrivacyVisibility;
  whoCanSeeFollowing: PrivacyVisibility;
  whoCanViewPosts: PrivacyVisibility;
}

export interface FriendEntry {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isOnline?: boolean;
  mutualCount?: number;
  level?: number;
}

export interface FollowEntry {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  isFollowing?: boolean;
  mutualCount?: number;
  level?: number;
  verification?: VerificationTier;
}

export type ActivityEventType =
  | "joined"
  | "post"
  | "achievement"
  | "badge"
  | "friend"
  | "league"
  | "level"
  | "media";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description?: string;
  timestamp: number;
  meta?: Record<string, unknown>;
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
  verificationStatus?: string;
  achievements?: Achievement[];
  badges?: Badge[];
  activityEvents?: ActivityEvent[];
  privacyConfig?: PrivacyConfig;
  avatarFrame?: AvatarFrame;
  profileTheme?: ProfileTheme;
  fullName?: string;
  website?: string;
  socialLinks?: SocialLinks;
}

export type ContentTab = "posts" | "media" | "reels" | "saved" | "about" | "friends";
