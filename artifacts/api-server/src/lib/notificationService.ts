import { db, notificationsTable } from "@workspace/db";
import { nanoid } from "./nanoid.js";
import { getIO } from "../ws/socket-manager.js";
import { logger } from "./logger.js";

export interface NotifPayload {
  playerId: string;
  type: "gift" | "gift_sent" | "rank" | "dn" | "system" | "post_like" | "post_comment" | "follow";
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function createNotification(payload: NotifPayload): Promise<void> {
  try {
    const id = nanoid();
    const now = new Date();

    await db.insert(notificationsTable).values({
      id,
      playerId: payload.playerId,
      type:     payload.type,
      title:    payload.title,
      body:     payload.body,
      data:     payload.data ?? {},
    });

    const io = getIO();
    if (io) {
      io.to(`player:${payload.playerId}`).emit("notification:push", {
        id,
        type:      payload.type,
        title:     payload.title,
        body:      payload.body,
        data:      payload.data ?? {},
        read:      false,
        createdAt: now.toISOString(),
      });
    }
  } catch (err) {
    logger.warn({ err, playerId: payload.playerId }, "createNotification failed (non-fatal)");
  }
}
