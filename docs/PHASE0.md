# Phase 0 — Foundation and acceptance record

Status: **in progress; HR approval pending**. Prepared 2026-10-04.

This implements the preparation work in the root [ROADMAP](../ROADMAP.md) R0 and
[SRS](../SRs.md) §6–7. The `docs/SRS.md` and `docs/ROADMAP.md` files describe the
legacy Portal. Requirement IDs below refer to the root SRS unless explicitly marked legacy.

## Deliverables and exit gate

| Deliverable | Status | Evidence / remaining work |
|---|---|---|
| Policy decision register | Prepared, awaiting HR | [POL-01–14 register](POLICY-DECISIONS.md); no example scoring values approved |
| Existing-system inventory | Code review complete | Inventory below; runtime checks remain separate |
| Role/data migration plan | Prepared, awaiting review | [Migration plan](MIGRATION-PLAN.md); no existing role inferred |
| Reproducible unit baseline | Prepared | `vitest.config.mts`, `tests/setup.ts`; fixed test-only environment without `.env` |
| Setup and migration procedures | Documented | Runbook below and README |
| Phase 0 acceptance | Pending | HR decisions with source/approver/date, technical review of migration plan, clean-environment setup evidence |

Preparing a register does not approve its contents. HR must record decisions or explicitly
approved deferrals with an owner and a gate before Phase 0 is marked complete. Production
release still requires R8 acceptance, including a restore drill and pilot.

## Inventory and reuse assessment

| Area | Current evidence | Reuse constraints / follow-up |
|---|---|---|
| Authentication | `auth.ts`, `auth.config.ts`, `lib/bootstrap.ts`: email Credentials, optional Google, public signup, first account ADMIN, later MEMBER | POL-09 must cover signup, OAuth account creation, recovery and session length. Username exists but is not a login identifier. Bootstrap is not an approved HR provisioning process. |
| Authorization | `lib/permissions.ts`, `lib/auth/require-session.ts`: four legacy ranks, DB-backed user/session checks; proxy only redirects | New roles need explicit capabilities and assignment/ownership checks on queries, actions and exports. An old ADMIN is not automatically an evaluation approver. Review missing-`sid` compatibility path and device ownership checks before staff rollout. |
| Account lifecycle | `lib/auth/deletion.ts`, security/profile/users actions: suspension, revocation, soft deletion and lazy 30-day deletion | Preserve existing IDs. POL-10/11 must govern personnel offboarding, pending deletion and retention of evaluation identity/history. |
| One-time links | `lib/auth/verification-tokens.ts`: shared hashed, expiring tokens consumed by invitation/verification/reset | Review purpose binding and concurrent consumption before reusing for staff provisioning; current primitive has no purpose field. |
| Audit | `lib/audit.ts`, `lib/action-codes.ts`: best-effort, typed codes; scoped queries and CSV | Retain operational audit. Required evaluation workflow history must commit atomically with state; best-effort audit is insufficient (DR-07). |
| Email/settings | `lib/email-config.ts`, `lib/secret-box.ts`, `lib/queries/settings.ts` | Stored complete SMTP config overrides env. Public settings select must exclude secrets. Preserve AUTH_SECRET and encryption labels during migration; both TOTP and SMTP depend on them. |
| Database | `prisma/schema.prisma`, checked-in migrations, `prisma.config.ts` | Prisma 7/Postgres; retain Auth.js contracts. No evaluation entities yet. Runtime/CLI URL precedence differs when DATABASE_URL is absent. |
| Deployment | `docker-compose.yml`, `.github/workflows/ci.yml`, `lib/logo-storage.ts`, `app/docs/page.tsx` | CI defines Postgres, checks, deploy and build. Runtime needs persistent uploads and readable docs; no job runner. No deployment/restore acceptance inferred from CI configuration. |
| Tests | `lib/permissions.test.ts`, `lib/auth/{totp,rate-limit}.test.ts` | 26 unit tests of legacy behavior. TOTP tests cover secret encryption, not the full challenge flow. No evaluation, database integration or browser acceptance yet. |

## Reproduce the baseline

Use Node **22.13 or newer** and the exact pnpm version in `package.json` (currently
11.17.0). CI uses Node 22. `pnpm-lock.yaml` is authoritative; do not regenerate dependencies
using the coexisting npm lockfile.

From a fresh checkout:

```sh
pnpm install --frozen-lockfile
pnpm test
```

Postinstall generates the Prisma client. Unit tests do not require `.env`, Postgres, SMTP or
Google. `tests/setup.ts` overrides relevant inherited environment values with disposable ones;
it is imported only by Vitest. Future integration tests must use a separate configuration and
an explicitly disposable database.

For typecheck/lint and local application setup:

1. Copy `.env.example` to `.env` only if `.env` does not already exist.
2. Generate `AUTH_SECRET` with `openssl rand -base64 32` and place it in `.env`.
3. Keep local database and Mailpit defaults; do not use a production database for development.
4. Run the commands below. `migrate deploy` applies committed migrations; `db:migrate` is for
   authoring new migrations in a development database.

```sh
pnpm db:up
pnpm exec prisma migrate deploy
pnpm typecheck
pnpm lint
pnpm build
pnpm dev
```

The build needs reachable migrated Postgres because public branding is read during rendering;
font downloads may also need network access. Mailpit is at `http://localhost:8025`.
Use `/signup` only to bootstrap a disposable legacy development instance. The seed reports
counts and does not create demo accounts. Staff provisioning is pending POL-09.

If the pnpm launcher stalls while selecting its pinned version, diagnose the launcher before
claiming scripts passed. The installed `node_modules/.bin/vitest run`, `tsc --noEmit` and
`eslint` can diagnose existing dependencies, but are not evidence of a fresh frozen install.

## Migration practice

- Check the target database privately before every database command; never paste connection
  strings or exported personnel data into logs or this repository.
- Never edit applied migrations. Author a new migration against a disposable development DB,
  inspect SQL ordering, and commit it with matching schema/application changes.
- For a noninteractive destructive diff, configure a separate disposable `SHADOW_DATABASE_URL`
  (example in `.env.example`), then use the repository's Prisma 7 command:

```sh
pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script
```

- Review generated SQL before saving it as a new migration. Apply reviewed migrations using
  `pnpm exec prisma migrate deploy`; inspect `pnpm exec prisma migrate status` afterward.
- Never use `db:reset`, `db push`, or a shadow URL pointing at retained data during cutover.
- Back up database, uploads and required secret material; restore into an isolated environment
  and verify it before cutover. See the migration plan for abort/rollback gates.

## Verification record — 2026-10-04

Results are recorded after running checks in this working tree. Local dependency checks do not
establish production readiness or approval of evaluation policy.


| Check | Result |
|---|---|
| `pnpm --version` | 11.17.0; launcher required execution outside the sandbox |
| `pnpm test` | Passed: 3 files / 26 tests |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed: 0 errors, 1 existing `no-img-element` warning at `components/account/TwoFactorSettings.tsx:46` |
| Invalid inherited env regression check | All 26 tests passed with blank AUTH_SECRET/app name and invalid AUTH_URL/SMTP_PORT |
| `git diff --check` | Passed |

The pnpm scripts above completed outside the sandbox after the sandbox launcher stalled.
The same installed binaries also passed inside it. Fresh dependency installation, production
build, live database/SMTP, browser E2E and backup/restore were not performed. The existing CI
workflow defines build/database checks but no remote CI result is claimed here.
