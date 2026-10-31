import { matchSessionManager } from "./match-session-service.ts";
import { CompetitiveMatchService } from "./competitive-match-service.ts";
import { CINDER_ROW_RELAY_8V8_PROFILE } from "./cinder-row-arena.ts";

export const competitiveMatchService = new CompetitiveMatchService(matchSessionManager);
export const competitiveMatchService8v8 = new CompetitiveMatchService(matchSessionManager, {
  profileId: CINDER_ROW_RELAY_8V8_PROFILE.id,
});
