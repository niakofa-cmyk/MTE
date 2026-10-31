import { Router, type IRouter } from "express";
import {
  SERVER_OPERATOR_IDS,
  type ServerOperatorId,
} from "../lib/authoritative-combat-systems.ts";
import {
  type CompetitiveMatchService,
  getCompetitiveRating,
} from "../lib/competitive-match-service.ts";
import {
  CINDER_ROW_RELAY_4V4_PROFILE,
  CINDER_ROW_RELAY_8V8_PROFILE,
  type CinderRowRelayProfileId,
} from "../lib/cinder-row-arena.ts";

const OPERATOR_IDS = new Set(SERVER_OPERATOR_IDS);

export function createCompetitiveRouter(
  competitiveMatches: CompetitiveMatchService,
  competitiveMatches8v8?: CompetitiveMatchService,
): IRouter {
  const router: IRouter = Router();
  const selectService = (value: unknown): CompetitiveMatchService | null => {
    if (value === undefined || value === CINDER_ROW_RELAY_4V4_PROFILE.id) {
      return competitiveMatches;
    }
    if (value === CINDER_ROW_RELAY_8V8_PROFILE.id && competitiveMatches8v8) {
      return competitiveMatches8v8;
    }
    return null;
  };

  router.get("/competitive/ranked/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "sign-in-required" });
      return;
    }
    try {
      const service = selectService(req.query.profileId);
      if (!service) {
        res.status(400).json({ error: "invalid-ranked-profile" });
        return;
      }
      const status = await service.status(req.user.id);
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
      Object.keys(req.body).some((key) => key !== "operatorId" && key !== "profileId") ||
      typeof req.body.operatorId !== "string" ||
      !OPERATOR_IDS.has(req.body.operatorId)
    ) {
      res.status(400).json({ error: "invalid-ranked-queue-request" });
      return;
    }
    try {
      const service = selectService(req.body.profileId);
      if (!service) {
        res.status(400).json({ error: "invalid-ranked-profile" });
        return;
      }
      const status = await service.enqueue(
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
    const service = selectService(req.query.profileId);
    if (!service) {
      res.status(400).json({ error: "invalid-ranked-profile" });
      return;
    }
    const status = await service.cancel(req.user.id);
    res.setHeader("Cache-Control", "no-store");
    if (status.state === "matched") {
      res.status(409).json({ error: "already-matched", ...status });
      return;
    }
    res.json(status);
  });

  return router;
}
