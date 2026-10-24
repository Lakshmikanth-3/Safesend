/**
 * One Vercel function serving both servers:
 *
 *   /agent/*   -> the agent   (prefix stripped)
 *   anything   -> the relayer
 *
 * Each app is loaded once per warm instance and handed the raw Node request, so every route, hook and
 * error handler behaves exactly as it does on a long-running server.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

type App = { ready(): Promise<unknown>; server: { emit(event: "request", req: IncomingMessage, res: ServerResponse): void } };
let relayer: App | undefined;
let agent: App | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = url.pathname;
  if (path === "/api" || path.startsWith("/api/")) path = path.slice(4) || "/";

  if (path === "/agent" || path.startsWith("/agent/")) {
    agent ??= (await import("../agent/src/index")).default as unknown as App;
    await agent.ready();
    req.url = (path.slice("/agent".length) || "/") + url.search;
    agent.server.emit("request", req, res);
  } else {
    relayer ??= (await import("../relayer/src/index")).default as unknown as App;
    await relayer.ready();
    req.url = path + url.search;
    relayer.server.emit("request", req, res);
  }
}
