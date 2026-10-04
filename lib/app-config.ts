/**
 * Client-safe display configuration.
 *
 * Only `NEXT_PUBLIC_*` values live here. Next inlines them at build time, so
 * this module is safe to import from Client Components.
 *
 * Deliberately separate from `lib/env.ts`: that module validates server
 * secrets and throws when they are missing, which would blow up in the browser
 * where `DATABASE_URL` and `AUTH_SECRET` are (correctly) undefined.
 *
 * Both variables are still *validated* — `lib/env.ts` requires them, so a
 * missing or misspelled one fails the server at boot. The `||` fallbacks below
 * are a last-resort default, not the contract; keep the static
 * `process.env.NEXT_PUBLIC_*` member access so Next inlines these at build time.
 */
export const appName = process.env.NEXT_PUBLIC_APP_NAME || "Portal";
export const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "portal.local";

/** College identity is separate from the runtime system display name. */
export const institutionName = process.env.NEXT_PUBLIC_INSTITUTION_NAME || "วิทยาลัยการอาชีพลอง";
