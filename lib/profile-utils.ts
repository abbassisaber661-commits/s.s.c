import { CONTENT_TABS, ContentTab } from './profile-constants';

// استخراج المعرفات الصالحة كنوع
const VALID_TAB_IDS = CONTENT_TABS.map(tab => tab.id) as readonly ContentTab[];

/**
 * إرجاع التبويب الافتراضي
 */
export function getDefaultProfileTab(): ContentTab {
  return 'posts';
}

/**
 * التحقق من صحة التبويب
 */
export function isValidProfileTab(tab: string): tab is ContentTab {
  return (VALID_TAB_IDS as readonly string[]).includes(tab);
}

/**
 * الحصول على التسمية المعروضة للتبويب
 */
export function formatTabLabel(tab: ContentTab): string {
  const found = CONTENT_TABS.find(t => t.id === tab);
  return found?.labelKey ?? tab;
}