import Avatar from "@/components/Avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  username: string;
  level: number;
  fame?: number;
  verified?: boolean;
  onLogout?: () => void;
  onShowAvatarSheet?: () => void;
  className?: string;
};

export default function ProfileHero({
  username,
  level,
  fame = 0,
  verified,
  onLogout,
  onShowAvatarSheet,
  className,
}: Props) {
  // دعم التنقل عبر لوحة المفاتيح (Keyboard Accessibility)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault(); // منع أي تصرف افتراضي غير مرغوب
      onShowAvatarSheet?.();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 flex items-center justify-between",
        "border border-gray-100 dark:border-gray-800",
        className
      )}
    >
      {/* القسم الأيسر */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* الـ Avatar قابل للنقر ويدعم لوحة المفاتيح */}
        <button
          onClick={onShowAvatarSheet}
          onKeyDown={handleKeyDown}
          className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
          aria-label="تغيير الصورة الشخصية"
        >
          <Avatar username={username} size="lg" online />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="font-bold text-lg truncate text-gray-900 dark:text-white">
              {username}
            </h2>

            {verified && (
              <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-500 text-white rounded-full text-[10px] font-bold">
                ✓
              </span>
            )}
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            المستوى {level} • الشهرة {fame}
          </div>
        </div>
      </div>

      {/* الأزرار الجانبية */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onShowAvatarSheet}
          onKeyDown={handleKeyDown}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          تغيير الصورة
        </button>

        <button
          onClick={onLogout}
          className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 active:scale-95 transition-all"
        >
          تسجيل الخروج
        </button>
      </div>
    </motion.div>
  );
}