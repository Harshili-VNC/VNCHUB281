// Server-only DB client. Never import this from client-side code — it will
// throw at import time if DATABASE_URL isn't set (which is correct for a
// server-only module, but would break the browser bundle if imported there).
//
// The side-effect import below is TanStack Start's explicit server-only
// marker: it makes the build plugin hard-deny any accidental client-side
// import of this module (instead of silently letting it leak into the
// browser bundle, which is what caused `postgres`'s Node-only `Buffer` usage
// to crash the app with "Buffer is not defined").
import "@tanstack/react-start/server-only";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

// NOTE: we call dotenv's config() function directly rather than importing
// the "dotenv/config" auto-run entry point. That entry point tries to parse
// CLI flags out of process.argv on import, which throws
// ("Cannot read properties of undefined (reading 'reduce')") in runtimes
// where process.argv isn't a normal populated array (e.g. this app's
// server/edge runtime). Calling config() ourselves does the same job
// (loads .env into process.env) without touching process.argv.
loadEnv();
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env, run `docker compose up -d`, then try again.",
  );
}

// Reuse a single connection across hot reloads in dev so we don't leak sockets.
const globalForDb = globalThis as unknown as { __vncHubQueryClient?: ReturnType<typeof postgres> };

const queryClient = globalForDb.__vncHubQueryClient ?? postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__vncHubQueryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
export { queryClient };
