import { Router, type IRouter } from "express";
import healthRouter        from "./health.js";
import piAuthRouter        from "./pi-auth.js";
import playersRouter       from "./players.js";
import matchesRouter       from "./matches.js";
import communityRouter     from "./community.js";
import economyRouter       from "./economy.js";
import notificationsRouter from "./notifications.js";
import messagesRouter      from "./messages.js";
import analyticsRouter     from "./analytics.js";
import followersRouter     from "./followers.js";
import marketplaceRouter   from "./marketplace.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(piAuthRouter);
router.use(playersRouter);
router.use(matchesRouter);
router.use(communityRouter);
router.use(economyRouter);
router.use(notificationsRouter);
router.use(messagesRouter);
router.use(analyticsRouter);
router.use(followersRouter);
router.use(marketplaceRouter);

export default router;
