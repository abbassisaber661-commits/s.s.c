import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, MessageCircle } from "lucide-react";
import type { Post } from "@/types/profile";

interface PostModalProps {
post: Post | null;
isOpen: boolean;
onClose: () => void;
}

export function PostModal({
post,
isOpen,
onClose,
}: PostModalProps) {
return (
<AnimatePresence>
{isOpen && post && (
<>
<motion.div
className="fixed inset-0 z-50 bg-black/80"
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
onClick={onClose}
/>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-full p-2"
          >
            <X size={18} />
          </button>

          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt=""
              className="w-full max-h-[450px] object-cover"
            />
          )}

          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">
                  {post.authorName}
                </h3>

                <p className="text-xs text-gray-500">
                  Level {post.authorLevel}
                </p>
              </div>
            </div>

            <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">
              {post.content}
            </p>

            <div className="flex items-center gap-5 mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Heart size={18} />
                <span>{post.likes}</span>
              </div>

              <div className="flex items-center gap-2">
                <MessageCircle size={18} />
                <span>{post.comments}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>

);
}