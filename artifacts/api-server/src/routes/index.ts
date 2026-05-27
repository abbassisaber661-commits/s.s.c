import { Router, type IRouter } from "express";
import healthRouter from "./health";
import piAuthRouter from "./pi-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(piAuthRouter);

export default router;
