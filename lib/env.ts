import { z } from "zod";

/**
 * Server-side environment. Parsed once, at import time, so a missing or
 * malformed variable fails the boot instead of surfacing as a confusing
 * runtime error deep inside a query or an auth callback.
 *
 * Never import this from a Client Component — it would leak secrets into the
 * browser bundle. Client-safe values go through NEXT_PUBLIC_* instead.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  POSTGRES_PRISMA_URL: z.string().min(1).optional(),
  POSTGRES_URL: z.string().min(1).optional(),
  POSTGRES_URL_NON_POOLING: z.string().min(1).optional(),

  AUTH_SECRET: z
    .string()
    .min(1, "AUTH_SECRET is required — generate one with `npx auth secret`"),
  AUTH_URL: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;

      const trimmed = value.trim();
      if (!trimmed) return undefined;

      const unquoted = trimmed.replace(/^(['"])(.*)\1$/, "$2").trim();
      return unquoted || undefined;
    },
    z.url({
      error:
        "AUTH_URL must be an absolute URL (for example, https://portal.example.com); do not include the variable name or surrounding quotes",
    }).optional(),
  ),

  // Optional: the Google provider is only registered when both are present.
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // Optional, same pattern as Google above. These are the *bootstrap* SMTP
  // config: they apply on a fresh install and are superseded once an admin
  // saves settings at /admin/email (ROADMAP 7.2). Resolution — all-or-nothing
  // on each side, database first — lives in lib/email-config.ts.
  // SMTP_USER/SMTP_PASS are separately optional since a local Mailpit/MailHog
  // dev server needs no auth.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Declared here to be *validated*, not to be read — read them from
  // lib/app-config.ts, which is the browser-safe module.
  //
  // They are required rather than optional on purpose: the failure being
  // guarded against is a misspelled variable name, and an optional field would
  // accept that silently. Without this, a typo'd NEXT_PUBLIC_APP_DOMAIN falls
  // back to a default and every project URL on the dashboard is quietly wrong.
  NEXT_PUBLIC_APP_NAME: z
    .string()
    .min(1, "NEXT_PUBLIC_APP_NAME is required — see .env.example"),
  NEXT_PUBLIC_APP_DOMAIN: z
    .string()
    .min(1, "NEXT_PUBLIC_APP_DOMAIN is required — see .env.example")
    .refine(
      (value) => !value.includes("://") && !value.includes("/"),
      "NEXT_PUBLIC_APP_DOMAIN must be a bare hostname (e.g. portal.example.com), not a URL",
    ),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
}).transform((values, ctx) => {
  const databaseUrl =
    values.DATABASE_URL ??
    values.POSTGRES_PRISMA_URL ??
    values.POSTGRES_URL ??
    values.POSTGRES_URL_NON_POOLING;

  if (!databaseUrl) {
    ctx.addIssue({
      code: "custom",
      path: ["DATABASE_URL"],
      message:
        "DATABASE_URL or a supported POSTGRES_* connection URL is required",
    });
    return z.NEVER;
  }

  return { ...values, DATABASE_URL: databaseUrl };
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables:\n${issues}\n\nCopy .env.example to .env and fill it in.`,
  );
}

export const env = parsed.data;

/** Google is wired up only when both halves of the credential are present. */
export const googleEnabled = Boolean(
  env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET,
);

// There is deliberately no `emailEnabled` const here any more. SMTP is now
// configurable at runtime from the admin panel (ROADMAP 7.2), so the answer
// lives in the database and cannot be a synchronous value derived from env.
// Use `isEmailEnabled()` from lib/email-config.ts, which resolves the database
// config first and falls back to the SMTP_* vars below.

// Client-safe display values (appName / appDomain) intentionally live in
// lib/app-config.ts — re-exporting them here would let a Client Component pull
// in this module and throw on the missing server secrets.
