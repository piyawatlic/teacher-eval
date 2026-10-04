import { vi } from "vitest";

// Override inherited values too so incomplete or production shell settings
// cannot affect the unit baseline. No database or mail service is required.
const environment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://unit:unit@127.0.0.1:1/unit_tests",
  AUTH_SECRET: "unit-test-only-secret-never-use-in-production",
  NEXT_PUBLIC_APP_NAME: "Evaluation unit tests",
  NEXT_PUBLIC_APP_DOMAIN: "unit.invalid",
} as const;

for (const [name, value] of Object.entries(environment)) {
  vi.stubEnv(name, value);
}

for (const name of [
  "POSTGRES_PRISMA_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING",
  "SHADOW_DATABASE_URL", "AUTH_URL", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET",
  "SMTP_HOST", "SMTP_PORT", "SMTP_FROM", "SMTP_USER", "SMTP_PASS",
]) {
  vi.stubEnv(name, undefined);
}
