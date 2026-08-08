import type { Express } from "express";
import { type Server } from "http";

/**
 * The game is fully client-side: progress, profiles and settings live
 * in localStorage (see client/src/game/storage.ts). The only real role
 * of the express layer is serving the built client bundle, so we keep
 * the API surface to a single tiny `/api/health` probe useful for
 * uptime checks.
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  return httpServer;
}
