import { createServer } from "http";
import app from "./app.js";
import profileRoutes from "./routes/profile.js";
import { setupSocketIO } from "./ws/socket-manager.js";
import { logger } from "./lib/logger.js";
import { runSeed, startDailyTournamentScheduler } from "./lib/seed.js";
import { startBotSimulator } from "./lib/bot-simulator.js";
import { startOfficialPagesSystem } from "./lib/official-pages.js";
import { initLeagueStore } from "./lib/league-store.js";
import { startSeasonScheduler } from "./routes/league-system.js";

const rawPort = process.env["PORT"];

// Replit's artifact system injects PORT=8080; fallback to 8080 locally.
const port = rawPort ? Number(rawPort) : 8080;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
setupSocketIO(server);

// ===============================
// 🟢 API Routes
// ===============================
app.use("/profile", profileRoutes);

server.listen(port, "0.0.0.0", async () => {
  logger.info({ port }, "Server listening (HTTP + WebSocket)");
  await runSeed();
  startDailyTournamentScheduler();
  initLeagueStore();
  startBotSimulator();
  startOfficialPagesSystem();
  startSeasonScheduler();
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.warn(
      { port },
      "Port already in use — another api-server instance is running (likely via Start application). Exiting cleanly.",
    );
    process.exit(0);
  }
  logger.error({ err }, "Server error");
  process.exit(1);
});