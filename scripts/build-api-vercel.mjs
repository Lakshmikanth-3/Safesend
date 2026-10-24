#!/usr/bin/env node
/**
 * Bundles the relayer and the agent into one self-contained Vercel function, in .vercel-api/.
 *
 *   node scripts/build-api-vercel.mjs
 *   cd .vercel-api && vercel deploy --prod
 *
 * Everything is inlined by esbuild, so Vercel needs no monorepo install. Secrets are never bundled:
 * they are set as Vercel environment variables on the project.
 */
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".vercel-api");
rmSync(join(out, "api"), { recursive: true, force: true });
mkdirSync(join(out, "api"), { recursive: true });

await build({
  entryPoints: [join(root, "scripts", "vercel-api-entry.ts")],
  outfile: join(out, "api", "index.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  // Some dependencies are CommonJS and call require() on Node built-ins.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  // Only loaded by pino's pretty transport, which is not used on Vercel.
  external: ["pino-pretty"],
  logLevel: "warning",
});

// The deployment file the services read at startup.
cpSync(join(root, "contracts", "deployments"), join(out, "contracts", "deployments"), { recursive: true });

writeFileSync(
  join(out, "vercel.json"),
  JSON.stringify(
    {
      functions: { "api/index.mjs": { maxDuration: 60, includeFiles: "contracts/**" } },
      rewrites: [{ source: "/(.*)", destination: "/api/index.mjs" }],
      // Serverless has no background timer: once a day the keeper refunds anything nobody answered
      // (opening a pause also refunds it once it is overdue).
      crons: [{ path: "/agent/keeper/cron", schedule: "0 2 * * *" }],
    },
    null,
    2,
  ),
);
writeFileSync(join(out, "package.json"), JSON.stringify({ name: "safesend-api", private: true, type: "module" }, null, 2));
console.log("built .vercel-api/api/index.mjs");
