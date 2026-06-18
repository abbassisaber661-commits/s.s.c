import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CONTENT_TABS, ContentTab } from "@/lib/profile-constants";

interface ProfileTabsProps {
  /** التبويب النشط حالياً */
  currentTab: ContentTab;
  /** دالة لتغيير التبويب */
  onTabChange: (tab: ContentTab) => void;
  /** قائمة التبويبات المراد عرضها (اختياري، افتراضياً الكل) */
  tabs?: ContentTab[];
  /** كلاس إضافي للتخصيص */
  className?: string;
  /** عدادات اختيارية للأقسام (يُعرض كـ badge) */
  postsCount?: number;
  reelsCount?: number;
  savedCount?: number;
}

export default function ProfileTabs({
  currentTab,
  onTabChange,
  tabs,
  className,
}: ProfileTabsProps) {
  // تحديد التبويبات المعروضة (إذا لم تُمرر، نأخذ الكل)
  const activeTabs = tabs ?? CONTENT_TABS.map((t) => t.id);

  // تثبيت دالة التغيير باستخدام useCallback لتجنب إعادة الإنشاء
  const handleTabClick = useCallback(
    (tabId: ContentTab) => {
      onTabChange(tabId);
    },
    [onTabChange]
  );

  return (
    <div
      className={cn(
        "flex gap-1 p-1 bg-white dark:bg-gray-900 rounded-2xl shadow-sm",
        "border border-gray-100 dark:border-gray-800",
        "overflow-x-auto scrollbar-hide",
        className
      )}
      role="tablist"
      aria-label="Profile tabs"
    >
      {activeTabs.map((tabId) => {
        const tabConfig = CONTENT_TABS.find((t) => t.id === tabId);
        if (!tabConfig) return null;

        const isActive = currentTab === tabId;

        return (
          <button
            key={tabId}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tabId}`}
            id={`tab-${tabId}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleTabClick(tabId)}
            className={cn(
              "relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              "whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
              isActive
                ? "text-white bg-gradient-to-r from-blue-500 to-purple-600 shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            {/* عرض الأيقونة إن وجدت */}
            {tabConfig.icon && <span className="mr-1.5">{tabConfig.icon}</span>}
            {tabConfig.label}

            {/* المؤشر المتحرك للتبويب النشط */}
            {isActive && (
              <motion.span
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-white rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}