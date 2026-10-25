import { GetPlayerProfileResponse } from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import { getPlayerProfile } from "../lib/profile-service";

const router: IRouter = Router();

router.get("/profile", async (req: Request, res: Response, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to view your saved inventory." });
    return;
  }
  try {
    res.json(GetPlayerProfileResponse.parse(await getPlayerProfile(req.user.id)));
  } catch (error) {
    next(error);
  }
});

export default router;
