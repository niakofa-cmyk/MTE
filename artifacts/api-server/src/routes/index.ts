import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { matchSessionManager } from "../lib/match-session-service.ts";
import { createMatchSessionsRouter } from "./matches.ts";
import authRouter from "./auth";
import profileRouter from "./profile";
import { createExtractionRouter } from "./extractions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(createMatchSessionsRouter(matchSessionManager));
router.use(createExtractionRouter(matchSessionManager));

export default router;
