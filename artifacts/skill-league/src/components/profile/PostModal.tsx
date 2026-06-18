// TODO: Implement PostModal
import type { Post } from "@/types/profile";

interface PostModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PostModal({ post, isOpen, onClose }: PostModalProps) {
  if (!isOpen || !post) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm">{post.content}</p>
      </div>
    </div>
  );
}
