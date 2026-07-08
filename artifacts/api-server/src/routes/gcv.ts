/**
 * GCV — internal community consensus price system.
 * ──────────────────────────────────────────────────
 * Purely additive, standalone feature. NOT the official Pi price, NOT a
 * payment/wallet system. Players vote (one vote each, changeable) for the
 * value they'd like the community to informally converge on for in-app
 * interactions. No money moves here — this only stores/aggregates votes.
 *
 * GET  /gcv/results?playerId=xxx  — vote counts + percentages per option
 *                                    (+ this player's current vote, if any)
 * POST /gcv/vote                  — { playerId, value } upsert one vote
 */
import { Router } from "express";
import { db, gcvVotesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

export const GCV_OPTIONS = ["314159", "214159", "114159", "14159", "1314", "0314"] as const;
type GcvOption = (typeof GCV_OPTIONS)[number];

function isValidOption(value: unknown): value is GcvOption {
  return typeof value === "string" && (GCV_OPTIONS as readonly string[]).includes(value);
}

router.get("/gcv/results", async (req, res) => {
  try {
    const playerId = typeof req.query.playerId === "string" ? req.query.playerId.trim() : "";

    const rows = await db
      .select({ value: gcvVotesTable.value, count: sql<number>`count(*)::int` })
      .from(gcvVotesTable)
      .groupBy(gcvVotesTable.value);

    const countsByValue: Record<string, number> = {};
    for (const r of rows) countsByValue[r.value] = Number(r.count);

    const totalVotes = Object.values(countsByValue).reduce((a, b) => a + b, 0);

    const options = GCV_OPTIONS.map((value) => {
      const votes = countsByValue[value] ?? 0;
      const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
      return { value, votes, percent };
    });

    let myVote: string | null = null;
    if (playerId) {
      const [row] = await db
        .select({ value: gcvVotesTable.value })
        .from(gcvVotesTable)
        .where(eq(gcvVotesTable.playerId, playerId))
        .limit(1);
      myVote = row?.value ?? null;
    }

    const consensus = options.reduce(
      (best, o) => (o.votes > best.votes ? o : best),
      options[0],
    );

    res.json({ options, totalVotes, myVote, consensusValue: totalVotes > 0 ? consensus.value : null });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

router.post("/gcv/vote", async (req, res) => {
  try {
    const { playerId, value } = req.body as { playerId?: string; value?: string };
    if (!playerId || !playerId.trim()) { res.status(400).json({ error: "missing playerId" }); return; }
    if (!isValidOption(value)) { res.status(400).json({ error: "invalid value" }); return; }

    await db
      .insert(gcvVotesTable)
      .values({ playerId: playerId.trim(), value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: gcvVotesTable.playerId,
        set: { value, updatedAt: new Date() },
      });

    res.json({ ok: true, value });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

export default router;
