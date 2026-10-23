import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { matchSessionManager } from "../lib/match-session-service.ts";
import { createMatchSessionsRouter } from "./matches.ts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(createMatchSessionsRouter(matchSessionManager));

export default router;
