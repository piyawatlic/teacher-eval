# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

- **`docs/SRS.md`** — the requirements specification (IEEE-830). What the system must do, every rule traced to the file that implements it, and an explicit list of what is deliberately out of scope. **Read it before changing authorization, auth, or the data model.**
- **`docs/ROADMAP.md`** — what is shipped versus what is a shell, and in what order the gaps should close.
- **`README.md`** — setup and orientation for humans.

Several toggles in this app persist state that nothing reads (see [Known shells](#known-shells)). Before "fixing" one, check `docs/ROADMAP.md` — the gap is usually known and sometimes the intended resolution is deletion, not implementation.

## Commands

Package manager is pnpm (see `pnpm-lock.yaml` / `pnpm-workspace.yaml`); a `package-lock.json` also exists but should not be treated as authoritative.

- `pnpm dev` — start the Next.js dev server (Turbopack)
- `pnpm build` — production build
- `pnpm start` — run the production build
- `pnpm lint` — run ESLint (`eslint-config-next` core-web-vitals + typescript rules)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm db:up` / `pnpm db:down` — start/stop Postgres + pgAdmin + Mailpit via `docker-compose.yml`
- `pnpm db:migrate` — `prisma migrate dev`; `pnpm db:studio`, `pnpm db:seed`, `pnpm db:reset`

Destructive schema changes make `prisma migrate dev` prompt, which fails in a non-interactive shell. Generate the SQL with `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` (needs `SHADOW_DATABASE_URL`), **check its statement order**, then apply with `prisma migrate deploy`. Note that `SHADOW_DATABASE_URL` is read by `prisma.config.ts` but is **not** listed in `.env.example` — you have to add it yourself.

`pnpm db:seed` inserts nothing; it only reports row counts. A fresh database is populated by signing up.

There is no test suite/framework configured in this repo.

Local setup: `cp .env.example .env`, fill in `AUTH_SECRET` (`npx auth secret`), `pnpm db:up`, `pnpm db:migrate`, `pnpm dev`, then sign up at `/signup`.

## Architecture

A **user-management application**: PostgreSQL (local Docker) + Prisma, with NextAuth v5 (Auth.js) for authentication. It began as a static Supabase-style hosting-console template; that domain layer (organizations, projects, domains, service versions) was deliberately removed. The app now does exactly one job — manage user accounts, roles and access.

Next.js App Router (`app/`), React 19, Tailwind CSS v4 (via `@tailwindcss/postcss`, tokens defined in `app/globals.css` using `@theme inline`), `lucide-react` for icons.

### Backend layout

- `prisma/schema.prisma` + `prisma.config.ts` — **Prisma 7**: the datasource URL lives in `prisma.config.ts` (not the schema), `.env` is loaded there via `dotenv`, the generator is `prisma-client` (not `prisma-client-js`) emitting TypeScript to `lib/generated/prisma`, and queries go through the `@prisma/adapter-pg` driver adapter. Import the client from `@/lib/prisma`.
- `auth.config.ts` — edge-safe Auth.js config (providers minus Credentials, `pages`, `authorized`, `isPublicPath`). **Must not import Prisma or bcrypt.**
- `auth.ts` — Node-side: Prisma adapter, Credentials + Google, JWT callbacks, `DeviceSession` lifecycle.
- `proxy.ts` — **Next 16 renamed `middleware.ts` to `proxy.ts`** (exports `proxy` + `config.matcher`, defaults to the Node runtime, and setting `runtime` there throws). It is a *redirect* layer only — it sees just the decoded JWT.
- `lib/auth/require-session.ts` — the real authorization layer. Every protected page and Server Action calls `requireUser()`; it is the only place revocation and account deletion are enforced.
- `lib/auth/{device,password,tokens,api-token,scopes,invitations,email-verification,password-reset,verification-tokens}.ts` — user-agent parsing for `DeviceSession` labels, bcrypt hash/verify, API-token minting/hashing (`tokens.ts`, including `tokenPreview()`, called from `lib/queries/account.ts`), bearer-token authentication (`api-token.ts`), the API-token scope vocabulary (`scopes.ts`), invitation email (`invitations.ts`), email-verification email (`email-verification.ts`), password-reset email (`password-reset.ts`), and the generic one-time-link primitive all three of those build on (`verification-tokens.ts`).
- `lib/email.ts` — `nodemailer` transport. SMTP config is resolved by **`lib/email-config.ts`**, not read from `lib/env.ts` directly: a complete `AppSettings` triple (host + port + from) wins outright, otherwise the `SMTP_*` env triple, otherwise email is off. **All-or-nothing on each side — the two are never merged**, or a half-finished admin edit sends mail from the wrong `From`. The transport is cached against a *fingerprint of the resolved config* rather than being a process-lifetime singleton, so a settings change takes effect on the next send; there is deliberately **no `resetTransporter()` hook**, since that would only invalidate the process that handled the save. `lib/url.ts` — `absoluteUrl()` for building links that leave the app.
- **There is no `emailEnabled` const.** It was deleted from `lib/env.ts` when SMTP became runtime-configurable — use `await isEmailEnabled()` from `lib/email-config.ts`. It is async because the answer lives in the database.
- `lib/secret-box.ts` — `encryptSecret`/`decryptSecret`, AES-256-GCM with a per-purpose key derived from `AUTH_SECRET` via `SECRET_LABELS`. Used by `lib/auth/totp.ts` (2FA) and the stored SMTP password. **The label strings are part of the at-rest format**: changing one doesn't migrate anything, it silently orphans every value encrypted under the old label — `TWO_FACTOR_AT_REST` in particular would brick every enrolled authenticator.
- `lib/logo-storage.ts` — writes an uploaded app logo straight to `public/uploads` at runtime (validated: ≤2MB, PNG/JPEG/WebP only — `image/svg+xml` is deliberately excluded, since an SVG served from this app's own origin executes embedded script if a browser is ever pointed at the file directly, unlike an `<img src>` reference). This assumes the same long-lived-Node-server deployment `/docs` already assumes reading a file off disk at request time — it does **not** survive a serverless target (no durable local disk). `lib/queries/settings.ts`'s `getAppSettings()` reads the resulting URL from the `AppSettings` singleton model (`id` fixed at `"singleton"` — the app-wide config table; a new setting is a new column here, not a new table), and is a public, unauthenticated read since the landing page and sign-in layout have no session.

  ⚠️ **`AppSettings` now also holds `smtpPassEncrypted`, a secret.** Because `getAppSettings()` is unauthenticated and its result reaches anonymous visitors, its `select` must stay explicit — never widen it to include the SMTP columns, and never let it become `select: undefined` (which returns every column). SMTP config is read separately by `lib/email-config.ts`, and the masked admin-facing view is `lib/queries/email-settings.ts`, which returns `hasPassword`/`passwordDecryptable` booleans but never the value or its ciphertext.
- `lib/permissions.ts` — the single source of truth for who may act on whom. Pure functions, no Prisma, no request context.
- `lib/queries/*` (read, `React.cache`d), `lib/actions/*` (`"use server"` mutations, including `invitations.ts`, `email-verification.ts` and `password-reset.ts` for their respective unauthenticated/self-service flows), `lib/audit.ts`, `lib/bootstrap.ts` (sign-up), `lib/format.ts` (display formatting).
- `ACTION_CODES` (the closed vocabulary for `logAudit()`'s `actionCode`) lives in `lib/action-codes.ts`, not `lib/audit.ts` — split out because `lib/audit.ts` imports `next/headers` and Prisma, and `AuditLogFilters.tsx` (a Client Component) needs the vocabulary for its "Filter by action" select without pulling those into the browser bundle. `lib/audit.ts` re-exports both `ACTION_CODES` and `ActionCode` for existing server-side importers. Add a new code in `lib/action-codes.ts` before using it anywhere — `AuditInput.actionCode` is typed against the derived `ActionCode` union, so an unlisted string fails to typecheck instead of silently writing an unfilterable row.

### Roles

`ADMIN` > `MANAGER` > `MEMBER` > `VIEWER`. Admins and managers reach `/` (the users table); members and viewers are redirected to `/account/preferences`.

Rules enforced in `lib/permissions.ts` and applied by every action in `lib/actions/users.ts`:

- Nobody may act on **themselves** through the admin surface — self-service lives in `/account`.
- A manager may only act on **strictly lower** ranks, and may only assign roles below their own. Both together prevent privilege escalation.
- Deleting is **admin-only**; managers may suspend instead.
- `assertNotLastAdmin` blocks demoting, suspending or deleting the final active admin — otherwise the users table becomes permanently unreachable.

Every action in `lib/actions/users.ts` routes through the private `loadActionable(targetId)` helper, which runs `requireUserManager()` + `canActOnUser()` in one place. New administrative actions should use it rather than re-deriving the check.

**The first account created (via `/signup`) becomes `ADMIN`**; everyone after is a `MEMBER`. That is what makes a fresh database usable.

Suspension and password resets revoke the target's `DeviceSession` rows, and `requireUser()` rejects `SUSPENDED`, so both take effect on the very next request.

Deletion is a **soft delete** (`softDeleteUser()` in `lib/auth/deletion.ts`, shared by the admin delete action and the self-service grace-period expiry): `deletedAt` is set, status becomes `SUSPENDED`, the email is rewritten to `deleted+<id>@invalid.local`, the username is nulled, and every linked OAuth `Account` row is deleted — so audit history survives, and both the email and the OAuth identity are freed for reuse. The `Account` deletion matters because Google resolves a returning sign-in by `providerAccountId`, not email; without it, a soft-deleted user's Google identity stays bound to the dead row and a later "Sign in with Google" silently resolves back to it instead of creating a fresh account (Auth.js has no status check on that path — `auth.ts`'s `signIn()` callback is defense-in-depth for that, mirroring the check the Credentials provider already does in `authorize()`).

**Adding a user invites, it doesn't create with a password.** `createUser()` sets `status: INVITED` and no `passwordHash` — the admin never sees or sets a password — then emails a one-time acceptance link via `sendInvitationEmail()` (`lib/auth/invitations.ts`). `acceptInvitation()` (`lib/actions/invitations.ts`, public at `/invite/accept`) sets the password, flips `status` to `ACTIVE`, and signs the invitee in immediately — same create-then-`signIn()` shape as `signUpAction`. A manager/admin can `resendInvitation()` on any still-`INVITED` row (`UserRowActions` swaps "Reset password" for "Resend invite" there, since there's no password yet to reset) — the prior token isn't revoked, just left to expire on its own, since it's already single-use. Requires email to be configured — `await isEmailEnabled()` (`lib/email-config.ts`), which resolves the `/admin/email` settings first and falls back to the `SMTP_*` env vars — and `createUser()` fails before creating anything if it isn't, rather than leaving a stuck `INVITED` row nobody can activate. Local dev points `lib/email.ts`'s `nodemailer` transport at a Mailpit container (`docker-compose.yml`, brought up by `pnpm db:up`) — sent mail never leaves the machine, viewable at `http://localhost:8025`. Link URLs are built by `lib/url.ts`'s `absoluteUrl()`, which prefers `AUTH_URL` and otherwise infers the origin from the request, same fallback Auth.js itself uses.

**Email verification stamps `User.emailVerified`, never gates anything.** Three paths: (1) a Credentials sign-up sends a best-effort link via `sendVerificationEmail()` — silently skipped if email isn't configured or the send fails, since registration must stay usable on a fresh install with no SMTP configured; (2) a Google sign-in stamps it directly from the provider's `email_verified` claim in `auth.config.ts`'s `profile()` (no link needed, Google already checked); (3) `acceptInvitation()` stamps it too, since clicking a link mailed to that address already proves control of it. `/verify-email?token=...` (public, `app/(auth)/verify-email/page.tsx`) verifies **on render** via a plain function call, not a `"use server"` action — a state-changing side effect triggered by navigation rather than a form submit, the same pattern `requireUser()`'s soft-delete-on-expiry already establishes. `resendVerificationEmail()` (`lib/actions/email-verification.ts`) lets a user with an unverified email request a fresh link from `/account/preferences`, which shows "Verified" / "Not verified" next to the (still read-only) email field.

All three invitation, verification, and password-reset tokens share one primitive: `lib/auth/verification-tokens.ts`'s `createVerificationToken(email, ttlMs)` / `consumeVerificationToken()` — SHA-256-hashed (`hashToken()`, the same function API tokens use), single-use (the row is deleted on a successful lookup), stored in the Auth.js adapter's `VerificationToken` model with no schema changes. `lib/auth/invitations.ts` calls it with a 7-day expiry, `lib/auth/email-verification.ts` with 24 hours, `lib/auth/password-reset.ts` with 1 hour (tighter, since a reset is more sensitive than an address-ownership check). `lib/email.ts` also exports a shared `escapeHtml()` used by all three email templates.

**Forgot password (`/forgot-password` → `/reset-password?token=...`)** is the one flow in the app deliberately hardened against enumeration: `requestPasswordReset()` (`lib/actions/password-reset.ts`) returns the identical `{ ok: true }` whether or not the submitted email matches an `ACTIVE` account — no message that varies by outcome, unlike sign-up's "already in use" check — since this form is the natural target for probing which addresses have accounts, in a way sign-up isn't. Whether email is configured at all is still revealed up front (that's operational state, not account data, so it's safe to fail loudly before the enumeration-safe check runs). `resetPassword()` consumes the token, then revokes **every** `DeviceSession` for the account — unlike a signed-in password change (`changePassword()` in `lib/actions/security.ts`), there's no "current session" to exempt, since the requester isn't authenticated yet; same shape as an admin-initiated reset. Signs the user in immediately afterward, mirroring sign-up and invitation-acceptance's create/activate-then-`signIn()` pattern. Audited as `account.password.reset_completed`, kept distinct from an admin's `user.password.reset`.

### Auth invariants

- The Credentials provider **forces `session.strategy: "jwt"`**, so the adapter's `Session` table stays permanently empty. The UI's session list is the separate `DeviceSession` model, keyed by the JWT's `sid`.
- Because a JWT is self-contained, revocation only bites where the DB is read — i.e. in `requireUser()`. Changing a password revokes all other `DeviceSession`s.
- Never unlink a user's last remaining sign-in method.
- **Every account must have a password**, even a Google-only one: `requireUser()` redirects anyone with no `passwordHash` to `/account/set-password` before anything else. The proxy forwards the request path as an `x-pathname` header so that page — and its own `changePassword` Server Action — can be exempted from the very check that sends people there; nothing else is. Google's `profile()` mapping in `auth.config.ts` also splits `given_name`/`family_name` into `firstName`/`lastName` so a Google sign-up isn't left with an unset name the way it otherwise would be.
- Auditing must never be the reason a user-visible operation fails — `logAudit` swallows its own errors by design. Don't add a code path that depends on it having succeeded.
- **This app has no scheduled-job infrastructure at all** — no cron, no queue, nothing time-triggered outside a request. Every time-based cleanup here either piggybacks on an existing request chokepoint (the 30-day account-deletion grace period is enforced lazily inside `requireUser()`, not by a job) or is deliberately left undone and documented rather than half-built (`AuditLog` has a recommended 365-day retention policy, `docs/SRS.md` DR-05, with no enforcement — there's no per-row request trigger to piggyback on the way deletion has one). Don't reach for a cron/job runner to solve a single new problem; that infrastructure doesn't exist yet for a reason.
- **Signing back in cancels a pending self-deletion request**, the same as clicking "Cancel deletion request" — `cancelPendingDeletion()` in `lib/auth/deletion.ts` runs from the `jwt()` callback's initial-sign-in branch in `auth.ts` (both Credentials and OAuth pass through it), and is also what the explicit Cancel action calls. It's a conditional `updateMany`, so signing in on an account with no pending request never writes a spurious audit row.
- **TOTP two-factor authentication is real**, scoped to the Credentials path only (Google sign-in isn't gated by it — there's no "current credential" to attach a second factor to on that path). Enrollment (`lib/actions/twoFactor.ts`) never writes `twoFactorSecret`/`twoFactorEnabled` until the user confirms one valid code; the not-yet-persisted secret is carried between steps as an opaque, encrypted, self-expiring, user-bound token (`lib/auth/totp.ts`), never as a raw hidden-form-field value. The sign-in challenge works by `authorize()` throwing a custom `TwoFactorRequired` (extends `CredentialsSignin`, with `.type` set explicitly since static properties don't otherwise survive the subclass) that `signInAction` catches to reveal a code field on the same form. **Known footgun already hit once:** `signIn()`'s options get serialized through `URLSearchParams`, which coerces an `undefined` value to the literal string `"undefined"` — never pass `code: possiblyUndefined` directly; omit the key entirely when there's no code.

### Known shells

These are persisted-but-inert, and the UI implies otherwise. Don't mistake them for working features, and don't assume the gap is an oversight — `docs/ROADMAP.md` Phase 1 covers each, and for some the intended resolution is removal:

- **`sidebarBehavior`** — stored and selectable; no sidebar reads it.
- **`telemetryEnabled`, `editEntitiesInCode`, `queueTableOperations`** — stored; nothing consults them.
- **Keyboard shortcuts** — toggles persist, but only ⌘K is implemented, and several labels name features removed with the tenancy layer.
- **`Authenticator`** — dead model. No WebAuthn.
- **`Header`'s Feedback/Docs/Bell buttons and the sidebar collapse control** — non-functional. (`AccountHeader`'s Feedback/Docs buttons are wired to real destinations; `Header`'s standalone copies are not.)

### Data flow

Pages are `async` server components that fetch and pass props down; sections take props. Two exceptions fetch directly (both `cache`d): `Header`/`AccountHeader` (used by eight pages total, across dashboard/users/admin and the five account-section pages) and `AuditLogsTable` (owns its filters and cursor). Both headers also call `getVisibleAnnouncement()` and render `AnnouncementBanner` (ROADMAP 6.3) — the dismissible admin-authored message — for the same reason: one call site reaching every signed-in page beats threading it into each page file. Mutations are Server Actions ending in `revalidatePath`; route handlers are reserved for `[...nextauth]`, machine APIs, webhooks, and file downloads (`app/account/audit-logs/export/route.ts` — a plain `GET` returning CSV via `Content-Disposition: attachment`, which a Server Action can't do). Audit-log filters are URL `searchParams`, not client fetches. That export route is **not** under `app/api/`, even though it's a route handler — it needs the ordinary session-cookie protection every page gets (`app/api/*` is deliberately public to the proxy, since bearer-token routes there own their own auth; this route doesn't).

`app/api/*` is excluded from the proxy's session-redirect gate (`PUBLIC_PREFIXES` in `auth.config.ts` includes `/api`) — every route handler under it owns its own authentication and its own error response, since redirecting a machine client to an HTML sign-in page makes no sense. `app/api/me/route.ts` is the first such route: `GET`, protected by `lib/auth/api-token.ts`'s `authenticateApiToken()` (bearer-token lookup by `ApiToken.tokenHash`, rejecting revoked/expired/deleted-or-suspended-owner the same way `getCurrentUser()` does for sessions, and stamping `ApiToken.lastUsedAt` without awaiting it — same fire-and-forget, error-swallowing shape as `touchDeviceSession()`). `ApiToken.scopes` is a controlled vocabulary (`lib/auth/scopes.ts`'s `API_TOKEN_SCOPES`, currently just `identity:read`), not free-form strings; a route checks its own required scope with `hasScope()` and returns `403` (not `401` — the token is valid, just not permitted) when it's missing. The creation form (`AccessTokensTable.tsx`) lets a user pick which scopes and how long a token lives; both are resolved server-side from a closed set (`<select>`/checkboxes), so a tampered request can't smuggle in an unrecognized scope or an arbitrary expiry date.

The pattern throughout: **server shell owns layout and copy, a small client leaf owns the interactivity** (`UserRowActions`, `CopyButton`, `ConnectionButton`, `AccountDeletionButton`, …), which keeps `SettingsCard`/`SettingsRow` composition intact.

Dates: render absolute strings from the server; `RelativeTime` upgrades to "2 minutes ago" only after hydration (via `useSyncExternalStore`) to avoid mismatches. Theme has two stores — `UserPreferences.theme` is authoritative, `localStorage` is the paint-blocking cache read by the inline script in `app/layout.tsx`; `useSyncedTheme` writes localStorage first, then the DB.

### Route ↔ layout composition

Each route in `app/` is a thin composition of layout chrome + section components pulled from `components/`. There's no shared root layout beyond fonts/global CSS in `app/layout.tsx` — every page independently composes its own header + sidebar:

- `app/page.tsx` — the **public landing page**. Reads no session (it must stay renderable for
  anonymous visitors); `/` is public via `PUBLIC_EXACT` in `auth.config.ts`, which is separate
  from `PUBLIC_PREFIXES` because a `/` prefix would make every path public.
- `app/dashboard/page.tsx` — the signed-in home for every role (`Header` + `IconSidebar`, `DashboardStats` + `RecentActivity`). `DEFAULT_SIGNED_IN_PATH` in `auth.config.ts` points here and is the fallback for every `callbackUrl`. Managers/admins get user-count stats and everyone's recent activity; members/viewers get their own activity only.
- `app/users/page.tsx` — the user-management table (`Header` + `IconSidebar` + `components/users/UsersTable`), reachable from the dashboard for managers and admins only — members and viewers are redirected to `/account/preferences`.
- `app/admin/*` — the admin panel, `ADMIN`-only via `requireAdmin()` in `lib/auth/require-session.ts` (stricter than `requireUserManager()` — redirects non-admins, managers included, to `/dashboard`). Split into four sub-routes (ROADMAP 7.3): **`/admin/branding`** (`AppNameSettings` + `LogoSettings`), **`/admin/announcements`** (`AnnouncementSettings` — publish/edit/deactivate a single message shown to every signed-in user until dismissed, rendered from `Header`/`AccountHeader` themselves via `getVisibleAnnouncement()` rather than threaded into each page), **`/admin/email`** (`EmailSettings`), and **`/admin/feedback`** (`FeedbackList`, capped at 100 rows rather than paginated). `app/admin/page.tsx` itself guards then `redirect()`s to `/admin/branding` — the guard runs *before* the redirect so a non-admin lands on `/dashboard` directly rather than bouncing through a sub-route.

  These pages compose `Header` + **`AdminSidebar`** and deliberately **drop `IconSidebar`**, mirroring how `/account/*` pairs `AccountHeader` with `SettingsSidebar`. There is **no `app/admin/layout.tsx`**, for the same reason there is no `app/account/layout.tsx`: `AdminSidebar` takes a typed `active` union prop that a layout cannot supply without falling back to `usePathname()`. `SidebarNavLink` (`components/layout/`) is the row shared by both text sidebars.

  The "Admin" and "Users" items in `IconSidebar` are both gated by props (`showAdmin`, `showUsers`), each defaulting to **`false`** so a new call site fails closed rather than showing a link the role cannot follow. The sidebar derives nothing itself — the pages own the role check, matching their route guards.
- `app/account/{preferences,security,access-tokens,audit-logs}/page.tsx` — account section: `AccountHeader` + `SettingsSidebar` (from `components/account/`), with an `active` prop identifying the current nav item. There is **no** `app/account/layout.tsx`.
- `app/(auth)/{signin,signup}/page.tsx` — bare layout, no dashboard chrome, without changing the URL. `app/(auth)/account/set-password/page.tsx` lives in this same route group for the same reason, even though its URL (`/account/set-password`) sits outside `/signin`/`/signup` — see the password-gate invariant above. `app/(auth)/invite/accept/page.tsx`, `app/(auth)/verify-email/page.tsx`, and `app/(auth)/{forgot-password,reset-password}/page.tsx` are here too — public via their respective prefixes in `PUBLIC_PREFIXES`, since none of them depend on a session.
- `app/docs/page.tsx` — reads `docs/SRS.md` off disk at request time and renders it with `react-markdown`/`remark-gfm`; gated the same as any other account page (via `AccountHeader`'s own `requireUser()`). Assumes a long-lived Node server (`pnpm start`/`next dev`); a serverless deploy target would need the file added to its file-tracing include list.
- `app/terms/page.tsx` — the one page besides `/` in `PUBLIC_EXACT` (`auth.config.ts`). Placeholder legal copy, explicitly marked as such on the page — not reviewed by a lawyer.

`app/layout.tsx` also wraps everything in `MobileNavProvider` → `SearchProvider` and renders `CommandPalette`, alongside the paint-blocking theme script.

### Component organization (by route family, not by type)

- `components/dashboard/` — app chrome (`Header`, `IconSidebar`, `AppLogo`, `CopyButton`, `FeedbackDialog`). `FeedbackDialog` is now used from both `Header` and `AccountHeader`; `Header`'s Docs button is a `Link` to `/docs`, same as `AccountHeader`'s. `Header`'s Notifications (Bell) button and `IconSidebar`'s collapse control were removed rather than wired — no notification system or sidebar-collapse state exists anywhere to back them. `NoticeBanner` (a hardcoded, non-persistently-dismissible Terms-of-Service notice rendered on 7 pages) was deleted — it's properly an admin-authored-announcement feature, deferred to `docs/ROADMAP.md` Phase 6.3 pending the same admin panel the logo-upload and feedback-viewing items need.
- `components/users/` — the user-management screen (`UsersTable` server component; `UserFilters`, `UserRowActions`, `CreateUserDialog`, `ResetPasswordDialog` client leaves).
- `components/admin/` — the admin panel (`/admin`). `LogoSettings.tsx` is the only section so far (6.1) — reuses `components/account/SettingsPrimitives.tsx` rather than duplicating card/row markup, same as every other settings-style screen.
- `components/account/` — account/preferences pages (`AccountHeader`, `SettingsSidebar`, plus each settings section as its own component: `ProfileInformation`, `Connections`, `AppearanceSettings` (theme only), `DangerZone`, `SecuritySettings` (password + `TwoFactorSettings` + active sessions), `AccessTokensTable`, `AuditLogsTable` (server, per-row client leaf `AuditLogRow.tsx` for expand/collapse — IP, user agent and `metadata` render in the expanded detail, not as columns)). `SettingsPrimitives.tsx` exports the shared `SectionHeading` / `SettingsCard` / `SettingsRow` building blocks used across the settings sections, and `Switch.tsx` is the shared toggle control (supports controlled `checked` + `onCheckedChange` as well as uncontrolled `defaultChecked`). Password change has exactly one UI: the inline form in `SecuritySettings.tsx` on `/account/security`, reachable from `/account/preferences` only via `SettingsSidebar`'s nav — there used to be a `SignInMethods` section on Preferences duplicating both that (via a `ChangePasswordDialog` modal) and provider linking (`Connections`/`ConnectionButton` already does that); both `SignInMethods.tsx` and `UnlinkProviderButton.tsx`, and the `getSignInMethods()` query, were deleted as redundant. `KeyboardShortcuts.tsx`, `DashboardSettings.tsx`, `AnalyticsMarketing.tsx` and `SidebarBehaviorSelect.tsx` were deleted the same way — all four were stored-but-unread `UserPreferences` toggles (the DB columns are dropped too); `UserPreferences` now has only `theme`. Don't reintroduce any of it.
- `components/auth/` — sign-in/sign-up forms and their shared `AuthPrimitives`, plus `GoogleButton`. These toast their failures like everything else (success is always a redirect, so there is no success result to announce). **`AuthPrimitives` has no `FormError` any more** — it was deleted, not moved. `Field` still takes an `error` string, but renders no message from it: it drives only the red border and `aria-invalid`, so a four-field sign-up still shows *which* input to fix while the text goes to the toast. `AuthErrorToast` is the bridge for the one error that is not a Server Action result — Auth.js reports provider/callback failures by redirecting to `/signin?error=...`, which `app/(auth)/signin/page.tsx` reads on the server and hands to that client component to announce.

  Two messages on this surface stay inline on purpose. The **2FA challenge** (`needsCode`) is the prompt for the code field that just appeared — an instruction the user reads while finding their phone, not a failed submission — so `SignInForm` blanks the state it passes to `useActionToast` in that case and renders the message itself; its retry ("Incorrect code. Try again.") stays in the same place. The **forgot-password success screen** is a whole screen rather than a message: it tells the user to go check their inbox, which is the next step in the flow and must not vanish on a timer.
- `components/layout/` — mobile navigation: `MobileNavProvider` (context), `MobileMenuButton`, `MobileDrawer`. Also `ToastProvider` (mounted in `app/layout.tsx`, exposes `useToast()`) — **the single feedback channel for every mutation in the app**, successes and failures alike. It is not a notification system and there is no bell/inbox (ROADMAP 1.8 removed that chrome deliberately).

  **Don't hand-roll a toast call from a form.** `useActionToast(state, success)` (`components/layout/useActionToast.ts`) is the bridge from a `useActionState` result to a toast: it fires once per genuinely new result (compared by object identity, so a re-render never re-announces and a resubmission that fails identically twice announces twice), routing `ok` to the success tone and `error`/`fieldErrors` to the danger tone. All of a submission's `fieldErrors` are joined into **one** toast rather than one per field. Pass a function as `success` to quote the result ("Test email sent to …"), or return `null` from it to toast only failures. Reach for `useToast()` directly only for a plain `useTransition` action that returns no state (session revocation, provider unlink, logo removal).

  Inline text is now reserved for **state**, not feedback: "Verified"/"Not verified" next to an email, "Saved. Leave blank to keep the current API key." under a password field, the SMTP source banner. The one deliberate exception is `AccessTokensTable`'s reveal panel — the plaintext token is shown exactly once and must never auto-dismiss, so that success renders inline and `useActionToast(state, () => null)` announces only failures.
- `components/search/` — the ⌘K `CommandPalette`, its `SearchProvider` and `SearchTrigger`. `search-data.ts` is a hardcoded nav list, not a live index.
- `components/theme/` — `useTheme` (reads) and `useSyncedTheme` (writes localStorage, then the DB).

When adding a new settings-style section, compose it from `SettingsPrimitives` (`SectionHeading` + `SettingsCard` + `SettingsRow`) rather than rebuilding card/row markup, to stay visually consistent with existing sections.

### Sidebar takes an `active` prop

`SettingsSidebar` takes a typed `active` union prop (`"Preferences" | "Access Tokens" | "Security" | "Audit Logs"`) to highlight the current nav item — pass the matching literal from the page that renders it.

### Naming / configuration conventions

The old `{{APP_NAME}}` / `{{APP_DOMAIN}}` template placeholders are gone. Never hardcode a product name.

**The displayed app name is a runtime setting** (ROADMAP 7.1), stored in `AppSettings.appName` and editable at `/admin/branding`. Read it from **`getAppSettings()`** (`lib/queries/settings.ts`), which already resolves the `NEXT_PUBLIC_APP_NAME` fallback, so callers never handle a null. Because it is runtime, a page whose `metadata` interpolates the name needs `async generateMetadata()` rather than `export const metadata`, and a Client Component needs it threaded as a prop from its server shell (`AppearanceSettings` is the one such consumer).

`lib/app-config.ts`'s `appName` is now only the **fallback** (used inside `getAppSettings()`) and the **TOTP issuer**. `lib/auth/totp.ts` keeps the build-time value on purpose: the issuer is written once into a third-party authenticator app and can never be updated from here, so a rename would leave a permanently split list rather than lock anyone out. `appDomain` currently has no consumers at all.

Two config modules, and the split matters:

- **`lib/app-config.ts`** — client-safe. `NEXT_PUBLIC_*` only, plain static `process.env.X` member access so Next inlines it at build time. Safe in Client Components.
- **`lib/env.ts`** — server only. Parses secrets with zod at import time and **throws** on anything missing or malformed, so a bad `.env` fails at boot rather than deep inside a query. **Never import it from a Client Component** — `DATABASE_URL` and `AUTH_SECRET` don't exist in the browser, so the parse would throw during hydration. It also validates the `NEXT_PUBLIC_*` names (required, and `APP_DOMAIN` must be a bare hostname) so a typo fails loudly instead of silently falling back to a default.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# How to use API Endpoint

- ** https://ovec-api-admin.eleccom.in.th/
- ** Endpoint OVEC_API_URL=https://ovec-api.eleccom.in.th

This API Key in .env file.