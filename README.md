# Teacher Performance Evaluation System

The teacher-evaluation project is in **Phase 0 preparation**. The running application is still
the Portal account-management foundation described below. Start with the root [SRS](SRs.md),
[roadmap](ROADMAP.md), and [Phase 0 record](docs/PHASE0.md). HR policy decisions and role/data
migration approval remain pending.

## Existing Portal foundation

A self-hosted **user management application**. One screen for administering accounts, roles and
access; one self-service area where every user manages their own profile, password, sessions and
API tokens; and an audit log recording all of it.

Built on Next.js 16 (App Router), React 19, Prisma 7 and Auth.js v5, against a local PostgreSQL
instance.

> This project descends from a Supabase-style hosting-console template. The multi-tenant layer —
> organizations, projects, domains — was deliberately removed. The app now does exactly one job.

---

## Features

**Authentication**
- Email + password, with case-insensitive lookup and no account-existence disclosure on failure
- Optional Google OAuth, enabled only when credentials are configured
- 30-day JWT sessions, plus a separate per-device session record you can list and revoke

**Roles and access**
- Four roles: `ADMIN` > `MANAGER` > `MEMBER` > `VIEWER`
- Privilege-escalation guards enforced in one pure module (`lib/permissions.ts`)
- The last active admin cannot be demoted, suspended or deleted

**User administration** *(admins and managers)*
- Invite users by email (one-time acceptance link, resendable), change roles, suspend and
  reactivate, reset passwords
- Soft delete that preserves audit history
- Search, role and status filters, cursor pagination, population stats

**Self-service** *(everyone)*
- Profile and username
- Password change — which revokes every *other* device session
- Linked sign-in methods, with a hard guarantee you can never unlink your last one
- Personal API tokens, shown in plaintext exactly once
- Theme, sidebar and notification preferences
- Account deletion request, cancellable

**Audit**
- 18 recorded action codes with actor, target, IP and user agent
- Non-managers see only their own entries, regardless of the requested scope
- Logging is best-effort and can never fail the operation it records

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3.2 (App Router, Turbopack) |
| UI | React 19.2.8, Tailwind CSS v4 via `@tailwindcss/postcss`, `lucide-react` icons |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta.32`) + `@auth/prisma-adapter` |
| Database | PostgreSQL, via Prisma 7.9.1 with the `@prisma/adapter-pg` driver adapter |
| Validation | zod 4 |
| Hashing | `bcryptjs` (passwords), SHA-256 (API tokens) |
| Language | TypeScript 5 |
| Package manager | pnpm 11.17.0 |

---

## Quick start

**Prerequisites:** Node.js 22.13+ and pnpm 11.17.0 (pinned in `package.json`). Docker is only needed for the local database; you can use a
Supabase Postgres database instead (see [Supabase setup](#supabase-postgres)).

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Create your environment file
cp .env.example .env

# 3. Generate an auth secret and paste it into AUTH_SECRET
npx auth secret

# 4. Start PostgreSQL + pgAdmin + Mailpit
pnpm db:up

# 5. Apply migrations
pnpm exec prisma migrate deploy

# 6. Run the dev server
pnpm dev
```

Then open <http://localhost:3000/signup>.

> **The first account you create becomes `ADMIN`.** Every account after it is a `MEMBER`. This is
> what makes a fresh database usable — there is no seeded user. `pnpm db:seed` intentionally
> inserts nothing; it only reports row counts.

### Optional: Google sign-in

Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, and register
`http://localhost:3000/api/auth/callback/google` as an authorised redirect URI. The Google button
appears only when both variables are present.

### Optional: Email (needed to invite users)

`.env.example`'s defaults already point `SMTP_HOST`/`SMTP_PORT`/`SMTP_FROM` at the Mailpit
container `pnpm db:up` starts — no real mail account needed locally. Sent mail (invitations today)
never leaves the machine; view it at <http://localhost:8025>. Point the same three variables at a
real SMTP provider in production. Inviting a user fails with a clear error until all three are set.

---

### Supabase Postgres

Add the database connection strings from your Supabase project to `.env`. The app uses
`POSTGRES_PRISMA_URL` for pooled runtime queries; Prisma CLI commands use
`POSTGRES_URL_NON_POOLING` when available, which is the direct connection recommended for schema
migrations. `DATABASE_URL`, when set, overrides both. If you only have one connection string, set
`DATABASE_URL` to it. Runtime connections preserve PostgreSQL/libpq's `sslmode=require` behavior:
traffic is encrypted, but hostname verification is disabled, and the certificate chain is not
verified unless `sslrootcert` is configured. Use a provider URL with a trusted CA and
`sslmode=verify-full` when full certificate verification is required.

For a new or existing database, deploy the checked-in migrations with:

```bash
pnpm exec prisma migrate deploy
```

This applies pending migrations without the development shadow-database workflow used by
`pnpm db:migrate`. Confirm the selected database before running it: migrations modify that database.

---

## Environment variables

`lib/env.ts` validates these with zod **at import time** and throws on anything missing or
malformed, so a bad `.env` fails at boot rather than deep inside a query.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | One required | Explicit PostgreSQL connection string; overrides the `POSTGRES_*` alternatives |
| `POSTGRES_PRISMA_URL` | One required | Pooled connection used by app queries when `DATABASE_URL` is unset |
| `POSTGRES_URL_NON_POOLING` | One required | Direct connection preferred by Prisma CLI commands when `DATABASE_URL` is unset |
| `POSTGRES_URL` | One required | Fallback PostgreSQL connection string for app queries |
| `AUTH_SECRET` | ✅ | `npx auth secret` |
| `AUTH_URL` | — | Set to the deployed HTTPS origin in production (not localhost); leave unset in development |
| `AUTH_GOOGLE_ID` | — | Google provider registers only if this *and* the secret are set |
| `AUTH_GOOGLE_SECRET` | — | |
| `NEXT_PUBLIC_APP_NAME` | ✅ | Product name used throughout the UI |
| `NEXT_PUBLIC_APP_DOMAIN` | ✅ | Must be a **bare hostname** — no scheme, no path |
| `SHADOW_DATABASE_URL` | — | Only for `prisma migrate diff`; an optional example is in `.env.example` |

At least one of these database URLs must be configured. If multiple are set, the app prefers
`DATABASE_URL`, then `POSTGRES_PRISMA_URL`, then `POSTGRES_URL`, and finally
`POSTGRES_URL_NON_POOLING`.

Two config modules, and the split matters: **`lib/app-config.ts`** is client-safe
(`NEXT_PUBLIC_*` only) and **`lib/env.ts`** is server-only and must never be imported from a
Client Component.

---

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / run it |
| `pnpm lint` | ESLint (`eslint-config-next`, core-web-vitals + TypeScript) |
| `pnpm test` | Vitest unit tests; no database or `.env` required |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:up` / `pnpm db:down` | Start / stop PostgreSQL + pgAdmin + Mailpit |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:seed` | Reports counts only — creates nothing |
| `pnpm db:reset` | Drop, recreate and re-migrate |

Run `pnpm test` for the Vitest unit baseline (26 tests for legacy permissions, secret encryption,
and rate limiting). Tests use isolated dummy configuration and do not load `.env`. See the
[Phase 0 runbook](docs/PHASE0.md) for setup, limitations and migration practices.

---

## Roles and permissions

| Role | Lands on | Can do |
|---|---|---|
| `ADMIN` | `/users` | Everything. The only role that may **delete** a user or assign `ADMIN`. |
| `MANAGER` | `/users` | Act on `MEMBER` and `VIEWER` only; assign only roles below `MANAGER`; suspend but never delete. |
| `MEMBER` | `/account/preferences` | Self-service only. |
| `VIEWER` | `/account/preferences` | Self-service only. |

The rules, all enforced in `lib/permissions.ts`:

- **Nobody may act on themselves** through the admin surface — self-service lives under `/account`.
- A manager may act only on **strictly lower** ranks, **and** may assign only roles below their
  own. Either rule alone leaves an escalation path open; together they close it.
- **Deleting is admin-only.** Managers suspend instead.
- The **final active admin** cannot be demoted, suspended or deleted — otherwise the users table
  becomes permanently unreachable.

Suspension and password resets revoke the target's device sessions, and every protected page and
action calls `requireUser()`, which rejects suspended and deleted accounts. Both therefore take
effect on the very next request.

---

## Project layout

```
app/
  page.tsx                     Users table — the main screen
  (auth)/{signin,signup}/      Bare-layout auth pages
  account/{preferences,security,access-tokens,audit-logs}/
  api/auth/[...nextauth]/      Auth.js handlers (Node runtime)
components/
  dashboard/   App chrome (Header, IconSidebar, NoticeBanner)
  users/       The user-management screen
  account/     Settings sections + shared SettingsPrimitives
  auth/        Sign-in / sign-up forms
  layout/      Mobile navigation
  search/      Command palette
  theme/       Theme hooks
lib/
  permissions.ts               Who may act on whom — pure, no Prisma
  auth/require-session.ts      The real authorization boundary
  actions/                     "use server" mutations
  queries/                     React.cache'd reads
  audit.ts, bootstrap.ts       Audit writes, sign-up
  env.ts, app-config.ts        Server / client configuration split
prisma/
  schema.prisma, migrations/, seed.ts
auth.ts, auth.config.ts, proxy.ts, prisma.config.ts
```

A note on the boundaries: **`proxy.ts` is a redirect layer only** — it sees just the decoded JWT
and is not an authorization boundary. `requireUser()` is. And `auth.config.ts` must stay
edge-safe: no Prisma, no bcrypt.

---

## Documentation

| Document | Covers |
|---|---|
| [`docs/SRS.md`](docs/SRS.md) | Full requirements specification (IEEE-830) — every rule, traced to the file that implements it |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | What is shipped, what is a shell, and what comes next |
| [`CLAUDE.md`](CLAUDE.md) | Architecture guide for coding agents |

---

## Development notes

**Mutations are Server Actions**, ending in `revalidatePath`. Route handlers are reserved for
`[...nextauth]`, machine APIs and webhooks. List filters are URL `searchParams`, resolved on the
server.

**The composition pattern throughout:** a server shell owns layout and copy; a small client leaf
owns the interactivity. When adding a settings section, compose it from `SettingsPrimitives`
(`SectionHeading` + `SettingsCard` + `SettingsRow`) rather than rebuilding card markup.

**Destructive schema changes** make `prisma migrate dev` prompt, which fails in a non-interactive
shell. Generate the SQL with
`prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`
(needs `SHADOW_DATABASE_URL`), **check the statement order**, then apply with
`prisma migrate deploy`.

**Package manager:** pnpm. A `package-lock.json` exists in the tree but is not authoritative.
