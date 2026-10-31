import {
  GetExtractionStatusResponse,
  SettleExtractionResponse,
} from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import {
  ExtractionReceiptNotFoundError,
  getServerExtractionReceipt,
  persistServerExtractionReceipt,
  settlePersistedExtraction,
} from "../lib/profile-service.ts";
import {
  MatchSessionError,
  type MatchSessionManager,
} from "../lib/match-session-manager.ts";

function getMatchAccessToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

const MATCH_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendError(res: Parameters<Parameters<IRouter["get"]>[1]>[1], error: unknown) {
  if (error instanceof ExtractionReceiptNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
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

  router.get("/matches/:matchId/extraction/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Sign in to secure extracted rewards." });
      return;
    }
    if (!MATCH_ID_PATTERN.test(req.params.matchId)) {
      res.status(400).json({ error: "A valid match ID is required." });
      return;
    }
    const accessToken = getMatchAccessToken(req.headers.authorization);
    if (!accessToken) {
      const receipt = await getServerExtractionReceipt(req.user.id, req.params.matchId);
      if (!receipt) {
        res.status(401).json({ error: "A valid match session or saved extraction is required." });
        return;
      }
      res.json(GetExtractionStatusResponse.parse({
        matchId: receipt.matchId,
        inRange: false,
        progress: 1,
        requiredSeconds: receipt.requiredSeconds,
        ready: true,
        settled: receipt.settled,
      }));
      return;
    }
    try {
      const status = manager.getExtractionStatus(req.params.matchId, accessToken, req.user.id);
      if (status.ready) {
        const reward = manager.getExtractionReward(req.params.matchId, accessToken, req.user.id);
        const receipt = await persistServerExtractionReceipt(
          req.user.id,
          req.params.matchId,
          reward.inventory,
          reward.requiredSeconds,
        );
        status.settled = receipt.settled;
      }
      res.json(GetExtractionStatusResponse.parse(status));
    } catch (error) {
      if (error instanceof MatchSessionError && error.code === "not-found") {
        const receipt = await getServerExtractionReceipt(req.user.id, req.params.matchId);
        if (receipt) {
          res.json(GetExtractionStatusResponse.parse({
            matchId: receipt.matchId,
            inRange: false,
            progress: 1,
            requiredSeconds: receipt.requiredSeconds,
            ready: true,
            settled: receipt.settled,
          }));
          return;
        }
      }
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
    if (!MATCH_ID_PATTERN.test(req.params.matchId)) {
      res.status(400).json({ error: "A valid match ID is required." });
      return;
    }
    const accessToken = getMatchAccessToken(req.headers.authorization);
    try {
      let receipt = null;
      let matchSessionError: unknown = null;
      if (accessToken) {
        try {
          const candidate = manager.getExtractionReward(
            req.params.matchId,
            accessToken,
            req.user.id,
          );
          receipt = await persistServerExtractionReceipt(
            req.user.id,
            candidate.matchId,
            candidate.inventory,
            candidate.requiredSeconds,
          );
        } catch (error) {
          if (
            error instanceof MatchSessionError &&
            (error.code === "not-found" || error.code === "extraction-not-ready")
          ) {
            matchSessionError = error;
          } else {
            throw error;
          }
        }
      }
      receipt ??= await getServerExtractionReceipt(req.user.id, req.params.matchId);
      if (!receipt) {
        if (matchSessionError) throw matchSessionError;
        if (!accessToken) {
          res.status(401).json({ error: "A valid match session or saved extraction is required." });
          return;
        }
        throw new ExtractionReceiptNotFoundError();
      }
      const result = await settlePersistedExtraction(req.user.id, req.params.matchId);
      res.json(SettleExtractionResponse.parse({
        matchId: receipt.matchId,
        ...result,
      }));
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}
