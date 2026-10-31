import app from "./app";
import { createServer } from "node:http";
import { logger } from "./lib/logger";
import { MatchRealtimeGateway } from "./lib/match-realtime-gateway.ts";
import { matchSessionManager } from "./lib/match-session-service.ts";
import { competitiveMatchService } from "./lib/competitive-match-service-instance.ts";

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

matchSessionManager.start();
competitiveMatchService.start();
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
  matchSessionManager.stop();
});
