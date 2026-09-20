import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../../../.env") });

function withPoolParams(raw: string, viaPooler: boolean) {
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set(
        "connection_limit",
        process.env.PRISMA_CONNECTION_LIMIT || "5",
      );
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set(
        "pool_timeout",
        process.env.PRISMA_POOL_TIMEOUT || "10",
      );
    }
    if (viaPooler && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const poolUrl = process.env.DATABASE_POOL_URL?.trim();
const directUrl = process.env.DATABASE_URL?.trim();
if (poolUrl) {
  process.env.DATABASE_URL = withPoolParams(poolUrl, true);
} else if (directUrl) {
  process.env.DATABASE_URL = withPoolParams(directUrl, false);
}
