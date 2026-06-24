// ─────────────────────────────────────────────
// 🔔 SkillLeague Notification Engine
// ─────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
}

export function createNotification(
  title: string,
  message: string
): Notification {
  return {
    id: crypto.randomUUID(),
    title,
    message,
    createdAt: Date.now(),
    read: false,
  };
}

export function markAsRead(
  notification: Notification
): Notification {
  return {
    ...notification,
    read: true,
  };
}

export function markAllAsRead(
  notifications: Notification[]
): Notification[] {
  return notifications.map((n) => ({
    ...n,
    read: true,
  }));
}

export function unreadCount(
  notifications: Notification[]
): number {
  return notifications.filter(
    (n) => !n.read
  ).length;
}