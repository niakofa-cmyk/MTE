import { createNodAuthoritativeMatch } from "./match-bootstrap.ts";
import { MatchSessionManager } from "./match-session-manager.ts";

export const matchSessionManager = new MatchSessionManager(() =>
  createNodAuthoritativeMatch(),
);
