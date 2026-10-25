import {
  GetExtractionStatusResponse,
  SettleExtractionResponse,
} from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { settleServerExtraction } from "../lib/profile-service";
import {
  MatchSessionError,
  type MatchSessionManager,
} from "../lib/match-session-manager.ts";

function getMatchAccessToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

function sendError(res: Parameters<Parameters<IRouter["get"]>[1]>[1], error: unknown) {
  if (error instanceof MatchSessionError) {
    const status =
      error.code === "unauthorized" ? 401 :
      error.code === "not-found" ? 404 :
      error.code === "extraction-not-ready" ? 409 :
      error.code === "server-capacity" ? 503 : 400;
    res.status(status).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: "Could not process extraction settlement." });
}

export function createExtractionRouter(manager: MatchSessionManager): IRouter {
  const router: IRouter = Router();

  router.get("/matches/:matchId/extraction/status", (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Sign in to secure extracted rewards." });
      return;
    }
    const accessToken = getMatchAccessToken(req.headers.authorization);
    if (!accessToken) {
      res.status(401).json({ error: "A valid match session is required." });
      return;
    }
    try {
      const status = manager.getExtractionStatus(req.params.matchId, accessToken, req.user.id);
      res.json(GetExtractionStatusResponse.parse(status));
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/matches/:matchId/extraction/settle", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Sign in to secure extracted rewards." });
      return;
    }
    if (
      typeof req.body === "object" &&
      req.body !== null &&
      Object.keys(req.body).length > 0
    ) {
      res.status(400).json({ error: "Reward values are calculated by the match server." });
      return;
    }
    const accessToken = getMatchAccessToken(req.headers.authorization);
    if (!accessToken) {
      res.status(401).json({ error: "A valid match session is required." });
      return;
    }
    try {
      const candidate = manager.getExtractionReward(
        req.params.matchId,
        accessToken,
        req.user.id,
      );
      const result = await settleServerExtraction(
        req.user.id,
        candidate.matchId,
        candidate.inventory,
      );
      manager.markExtractionSettled(req.params.matchId, accessToken, req.user.id);
      res.json(SettleExtractionResponse.parse({
        matchId: candidate.matchId,
        ...result,
      }));
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}
