import { matchSessionManager } from "./match-session-service.ts";
import { CompetitiveMatchService } from "./competitive-match-service.ts";

export const competitiveMatchService = new CompetitiveMatchService(matchSessionManager);
