import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, marketplaceListingsTable, playersTable, coinTransactionsTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

router.get("/marketplace", async (req, res) => {
  try {
    const { type, maxPrice } = req.query;
    let query = db.select().from(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.status, "active"))
      .orderBy(desc(marketplaceListingsTable.createdAt))
      .limit(100);
    const rows = await query;
    let result = rows;
    if (type) result = result.filter(r => r.itemType === type);
    if (maxPrice) result = result.filter(r => r.price <= Number(maxPrice));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "marketplace list error");
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/marketplace", async (req, res) => {
  try {
    const { sellerId, itemId, itemName, itemEmoji, itemType, price } = req.body;
    const seller = await db.select().from(playersTable).where(eq(playersTable.id, sellerId)).limit(1);
    if (!seller.length) return res.status(404).json({ error: "player_not_found" });
    if (!seller[0].ownedItems.includes(itemId)) return res.status(400).json({ error: "item_not_owned" });

    const listing = await db.insert(marketplaceListingsTable).values({
      id: nanoid(),
      sellerId,
      sellerName: seller[0].username,
      itemId,
      itemName,
      itemEmoji: itemEmoji || "🎨",
      itemType: itemType || "cosmetic",
      price: Math.max(10, Math.min(99999, Number(price))),
    }).returning();
    res.json(listing[0]);
  } catch (err) {
    req.log.error({ err }, "marketplace create error");
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/marketplace/:id/buy", async (req, res) => {
  try {
    const { id } = req.params;
    const { buyerId } = req.body;

    const [listing] = await db.select().from(marketplaceListingsTable)
      .where(and(eq(marketplaceListingsTable.id, id), eq(marketplaceListingsTable.status, "active"))).limit(1);
    if (!listing) return res.status(404).json({ error: "listing_not_found" });
    if (listing.sellerId === buyerId) return res.status(400).json({ error: "cannot_buy_own" });

    const [buyer] = await db.select().from(playersTable).where(eq(playersTable.id, buyerId)).limit(1);
    if (!buyer) return res.status(404).json({ error: "buyer_not_found" });
    if (buyer.coins < listing.price) return res.status(400).json({ error: "insufficient_coins" });

    await db.update(marketplaceListingsTable).set({
      status: "sold", buyerId, soldAt: new Date(),
    }).where(eq(marketplaceListingsTable.id, id));

    await db.update(playersTable).set({ coins: buyer.coins - listing.price }).where(eq(playersTable.id, buyerId));
    const [seller] = await db.select().from(playersTable).where(eq(playersTable.id, listing.sellerId)).limit(1);
    if (seller) {
      await db.update(playersTable).set({ coins: seller.coins + listing.price }).where(eq(playersTable.id, listing.sellerId));
    }

    const buyerItems = buyer.ownedItems.includes(listing.itemId) ? buyer.ownedItems : [...buyer.ownedItems, listing.itemId];
    await db.update(playersTable).set({ ownedItems: buyerItems }).where(eq(playersTable.id, buyerId));

    await db.insert(coinTransactionsTable).values([
      { id: nanoid(), playerId: buyerId, amount: -listing.price, type: "spend", source: "marketplace", description: `شراء ${listing.itemName}`, balanceAfter: buyer.coins - listing.price },
      { id: nanoid(), playerId: listing.sellerId, amount: listing.price, type: "earn", source: "marketplace", description: `بيع ${listing.itemName}`, balanceAfter: (seller?.coins ?? 0) + listing.price },
    ]);

    res.json({ ok: true, item: listing.itemId });
  } catch (err) {
    req.log.error({ err }, "marketplace buy error");
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/marketplace/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sellerId } = req.body;
    await db.update(marketplaceListingsTable)
      .set({ status: "cancelled" })
      .where(and(eq(marketplaceListingsTable.id, id), eq(marketplaceListingsTable.sellerId, sellerId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "marketplace cancel error");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
