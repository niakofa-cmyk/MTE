import app from "./app";
import { createServer } from "node:http";
import { logger } from "./lib/logger";
import { MatchRealtimeGateway } from "./lib/match-realtime-gateway.ts";
import { matchSessionManager } from "./lib/match-session-service.ts";
import {
  competitiveMatchService,
  competitiveMatchService8v8,
} from "./lib/competitive-match-service-instance.ts";
import { interruptUnfinishedCompetitiveMatches } from "./lib/competitive-match-service.ts";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const interruptedRankedMatches = await interruptUnfinishedCompetitiveMatches();
if (interruptedRankedMatches > 0) {
  logger.warn(
    { count: interruptedRankedMatches },
    "Marked unfinished ranked matches as interrupted; no rating was awarded.",
  );
}
matchSessionManager.start();
competitiveMatchService.start();
competitiveMatchService8v8.start();
const server = createServer(app);
const matchRealtimeGateway = new MatchRealtimeGateway(matchSessionManager);
matchRealtimeGateway.attach(server);
server.once("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
server.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.once("close", () => {
  matchRealtimeGateway.close();
  competitiveMatchService.stop();
  competitiveMatchService8v8.stop();
  matchSessionManager.stop();
});
