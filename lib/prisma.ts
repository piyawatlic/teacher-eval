import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { env } from "@/lib/env";

// Prisma 7 talks to Postgres through a driver adapter rather than a bundled
// Rust engine, so the connection string is handed to PrismaPg here.
// The Prisma CLI honours a `?schema=` param on the URL, but the driver adapter
// does not — it needs the schema passed explicitly, or every query targets
// `public` while migrations went elsewhere.
function createPrismaClient() {
  const connectionUrl = new URL(env.DATABASE_URL);
  const schema = connectionUrl.searchParams.get("schema") ?? undefined;

  // pg-connection-string now treats sslmode=require as verify-full by default.
  // Preserve libpq's require behavior for hosted URLs: encrypt the connection
  // while allowing providers whose pooler certificate is not publicly trusted.
  if (connectionUrl.searchParams.get("sslmode") === "require") {
    connectionUrl.searchParams.set("uselibpqcompat", "true");
  }

  const adapter = new PrismaPg(
    { connectionString: connectionUrl.toString() },
    schema ? { schema } : undefined,
  );
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Next's dev server re-evaluates modules on every HMR pass. Without this cache
// each pass would open a new pool and eventually exhaust Postgres connections.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
