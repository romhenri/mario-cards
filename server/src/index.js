import http from "node:http";
import { log } from "./logger.js";
import { createWsServer } from "./wsServer.js";

const PORT = Number(process.env.PORT ?? 8787);

const httpServer = http.createServer((req, res) => {
  // Plain HTTP is only used as a health check; the game runs over WebSocket.
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "mario-cards-server" }));
});

createWsServer(httpServer);

httpServer.listen(PORT, () => {
  log(`mario-cards server listening on ws://localhost:${PORT}`);
});
