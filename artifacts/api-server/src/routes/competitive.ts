import { Router, type IRouter } from "express";
import {
  SERVER_OPERATOR_IDS,
  type ServerOperatorId,
} from "../lib/authoritative-combat-systems.ts";
import {
  type CompetitiveMatchService,
  getCompetitiveRating,
} from "../lib/competitive-match-service.ts";

const OPERATOR_IDS = new Set(SERVER_OPERATOR_IDS);

export function createCompetitiveRouter(
  competitiveMatches: CompetitiveMatchService,
): IRouter {
  const router: IRouter = Router();

  router.get("/competitive/ranked/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "sign-in-required" });
      return;
    }
    try {
      const status = await competitiveMatches.status(req.user.id);
      const rating = status.state === "idle"
        ? await getCompetitiveRating(req.user.id)
        : status.rating;
      res.setHeader("Cache-Control", "no-store");
      res.json({ ...status, rating });
    } catch {
      res.status(503).json({ error: "ranked-status-unavailable" });
    }
  });

  router.post("/competitive/ranked/queue", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "sign-in-required" });
      return;
    }
    if (
      typeof req.body !== "object" ||
      req.body === null ||
      Object.keys(req.body).length !== 1 ||
      typeof req.body.operatorId !== "string" ||
      !OPERATOR_IDS.has(req.body.operatorId)
    ) {
      res.status(400).json({ error: "invalid-ranked-queue-request" });
      return;
    }
    try {
      const status = await competitiveMatches.enqueue(
        req.user.id,
        req.body.operatorId as ServerOperatorId,
      );
      res.setHeader("Cache-Control", "no-store");
      res.status(202).json(status);
    } catch {
      res.status(503).json({ error: "ranked-queue-unavailable" });
    }
  });

  router.delete("/competitive/ranked/queue", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "sign-in-required" });
      return;
    }
    const status = await competitiveMatches.cancel(req.user.id);
    res.setHeader("Cache-Control", "no-store");
    if (status.state === "matched") {
      res.status(409).json({ error: "already-matched", ...status });
      return;
    }
    res.json(status);
  });

  return router;
}
