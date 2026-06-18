export type SocialListType = 'followers' | 'following' | 'friends';

export type ContentTab =
  | 'posts'
  | 'media'
  | 'stories'
  | 'likes'
  | 'activity'
  | 'stats'
  | 'trophies'
  | 'ai'
  | 'referral';

export interface TabConfig {
  id: ContentTab;
  labelKey: string; // للمترجم
  icon: string;     // اسم الأيقونة من مكتبة مثل Lucide
}

export const CONTENT_TABS = [
  { id: 'posts', labelKey: 'tabs.posts', icon: 'FileText' },
  { id: 'media', labelKey: 'tabs.media', icon: 'Image' },
  { id: 'stories', labelKey: 'tabs.stories', icon: 'Circle' },
  { id: 'likes', labelKey: 'tabs.likes', icon: 'Heart' },
  { id: 'activity', labelKey: 'tabs.activity', icon: 'Activity' },
  { id: 'stats', labelKey: 'tabs.stats', icon: 'BarChart' },
  { id: 'trophies', labelKey: 'tabs.trophies', icon: 'Trophy' },
  { id: 'ai', labelKey: 'tabs.ai_tips', icon: 'Bot' },
  { id: 'referral', labelKey: 'tabs.invite', icon: 'UserPlus' },
] as const satisfies readonly TabConfig[];