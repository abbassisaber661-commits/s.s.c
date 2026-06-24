import { X } from "lucide-react";

type Item = {
  id: string;
  username: string;
};

type Props = {
  type: "followers" | "following" | "friends" | null;
  items: Item[];
  allCount: number;
  loading?: boolean;
  onClose: () => void;
};

export default function ProfileListSheet({
  type,
  items,
  allCount,
  loading,
  onClose,
}: Props) {
  if (!type) return null;

  const title =
    type === "followers"
      ? "Followers"
      : type === "following"
      ? "Following"
      : "Friends";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white dark:bg-gray-900 w-full max-h-[70vh] rounded-t-2xl p-4 overflow-y-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">
            {title} ({allCount})
          </h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="text-center text-gray-500 py-10">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            No {title.toLowerCase()} yet
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="font-medium">
                  @{user.username}
                </div>

                <button className="text-xs px-3 py-1 bg-blue-500 text-white rounded">
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}