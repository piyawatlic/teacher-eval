# Phase 0 — Role and data migration plan

Status: **proposal for technical and HR review, not executed** (2026-10-04).
References: root [SRS](../SRs.md) §2.1, DR-01–08, NFR-01–03/11 and
[policy register](POLICY-DECISIONS.md), particularly POL-04/09/10/11.

## Constraints and risks

Preserve User IDs, credential hashes, OAuth identities, audit references and existing account
status. Never derive TEACHER from MEMBER/VIEWER, COMMITTEE from MANAGER, or evaluation approval
power from ADMIN. The current single Role enum cannot represent simultaneous teacher/committee
membership. The project direction recorded on 2026-10-04 selects separate multi-role
assignments and capability-based authorization (decision ARCH-01 below). HR still approves
individual mappings and conflict/authority rules under POL-04/10.

| Risk | Required treatment and evidence |
|---|---|
| Privilege escalation or admin lockout | HR-reviewed per-user mapping; named authorized operator/recovery procedure; negative authorization tests and a verified active admin before reopening access |
| Unmapped/inactive/deleted users | No evaluation grants by default; hold for explicit disposition; never reactivate through mapping |
| New OAuth/signup accounts bypass HR | Review all admission paths, adapter defaults, bootstrap and invitation actions together under POL-09 |
| Role stored in existing JWTs | Revoke device sessions during cutover and require reauthentication; authorize using current DB roles, including APIs and exports |
| Personal API tokens survive access changes | Inventory/revoke or explicitly retain identity-only tokens; never automatically add evaluation scopes |
| Old deletion path destroys historical identity | Review pending deletion and offboarding before adding personnel links; restrict/correct lifecycle under POL-10/11 |
| Cascades or enum replacement lose data | Additive schema first; explicit foreign keys and constraints; no destructive contraction until reconciliation and rollback window approval |
| Mutable profiles/rubrics alter old reports | Snapshot required identity/rubric/result data; approved correction creates a version, not silent replacement |
| Workflow event missing after status update | Persist mandatory history in the same transaction as transition; retain separate best-effort operational audit |
| Secret rotation during migration | Retain AUTH_SECRET and encryption labels; back up securely and verify TOTP/SMTP recovery without exposing secrets |

## ARCH-01 — Multi-role identity and capability authorization

Selected by project direction on 2026-10-04; implementation and HR access acceptance pending.

- Keep `User` as the identity record. Introduce a separate role-assignment relation with a
  foreign key to User and a unique `(userId, role)` constraint. A provisioned evaluation user
  has one or more assignments; an unmapped legacy user has none and receives no evaluation access.
- Use a closed vocabulary for ADMIN, COMMITTEE and TEACHER assignments. Do not introduce
  combination roles such as TEACHER_COMMITTEE or infer a highest role. The exact Prisma model
  names are implementation details to settle in Phase 1.
- Resolve capabilities explicitly from active role assignments, then apply account status,
  resource ownership, committee assignment, workflow state and approved conflict restrictions.
  Having another role never bypasses these restrictions. No implicit ADMIN wildcard grants
  scoring, approval or finalization authority; authority rules still require POL-04 acceptance.
- Keep capabilities centrally defined and testable; a database-driven permission editor is not
  required by this design decision. Navigation may reflect capabilities, but every server entry
  point must enforce them independently.
- Add the relation without dropping or rewriting `User.role` or its enum. Backfill only from the
  HR-reviewed manifest. Keep legacy data through mapping, acceptance and the rollback window.
- Define the authorization source per surface during transition: existing Portal surfaces use
  legacy checks until migrated; evaluation surfaces use new assignments only. Never fall back to
  legacy ranks when an evaluation capability is absent. Switch each consumer explicitly and
  maintain a checklist so queries, actions, exports, APIs and navigation cannot be overlooked.
- Freeze legacy role edits during cutover or reconcile them through an approved mapping process;
  do not invent automatic dual-write mappings. Retaining a legacy column alone does not make an
  old application safe to roll back after new role grants or revocations.

Acceptance cases: a TEACHER + COMMITTEE user sees only their own published teacher results and
can score only assigned eligible evaluations; no other teacher's results or unassigned work
becomes accessible. Removing COMMITTEE preserves TEACHER access and blocks scoring on the next
protected request. Duplicate assignments fail, unmapped users fail closed, and extra roles do
not override suspension, submission locks or conflict restrictions. Self-assessment remains
unavailable until an explicit POL-10 rule permits it.

## Preflight inventory (read-only, to run against an approved target)

Record environment, application commit, schema/migration version and operator. Collect counts
by role/status, deleted and pending-deletion accounts, active admins, missing/duplicate profile
identifiers, OAuth links, sessions, tokens, preferences and audit rows. Use User IDs for mapping;
email/name alone are not evidence of employment or committee authority.

Prepare an access-controlled manifest with:

`userId, currentRole, currentStatus, targetRole(s), staff/profile reference, disposition,
approver, approvalDate, policyVersion`

Require exactly one disposition for every existing account, no unknown/duplicate IDs, no automatic
promotion, and explicit treatment of service/demo accounts. Do not commit this personal-data
manifest. An empty/new installation still needs a documented initial HR admin provisioning path.

## Ordered implementation and cutover

1. Use the selected multi-role representation. Resolve remaining POL-04/09/10 rules and approve
   the manifest. Define capability tests for ADMIN/HR, COMMITTEE, TEACHER and TEACHER + COMMITTEE.
2. Implement additive migrations preserving existing identity contracts. Model unique staff IDs,
   account/profile ownership, round identity, assignment uniqueness, rubric versions, current
   evaluation uniqueness and history constraints in their delivery phases. Do not create empty
   evaluation shells in Phase 0.
3. Update every role consumer together: Prisma/generated types, Auth.js defaults/JWT/session
   types, bootstrap/invitation/role actions, permissions/guards, user filters, queries, API,
   command palette, navigation and tests. A new ADMIN must not gain scoring-on-behalf privileges.
4. Rehearse on an isolated restored copy. Backfill from the approved manifest with explicit
   preconditions; stop on drift, missing mappings or mismatched counts. Make backfill retryable
   and reconcile identities, roles, statuses and references before and after.
5. Test cross-role and cross-record denial for direct page/action/query/API/export requests;
   suspended/deleted users, revoked/missing sessions, old JWTs, and assignment removal. Verify
   login/recovery, last-admin safety, SMTP and encrypted TOTP preservation.
6. Schedule a maintenance window, pause writes, take and verify a final backup including uploads
   and required secrets. Apply reviewed migrations with `prisma migrate deploy`, run mapping,
   revoke sessions, reconcile, smoke-test, then reopen only after the operator signs off.
7. Remove legacy role values/columns only in a later reviewed migration after compatibility,
   complete mapping, acceptance and expiry of the agreed rollback window. Never rewrite applied SQL.

## Abort and rollback

Abort before reopening if any mapping is missing, an active admin cannot authenticate, history
counts/references differ unexpectedly, secrets fail validation, or authorization tests fail.
Record the reason and keep writes stopped. Additive changes may permit application rollback only
if the old application is proven compatible with both schema and data; do not assume it is.

For incompatible schema/data, restore the verified pre-cutover database and uploads with the
matching application commit and secret material in a controlled maintenance window. Reconcile
any accepted writes before switching back; restoration is not a lossless rollback after new
writes. Rehearse both restore and access revocation in non-production first. Migration deploy
has no automatic down-migration. RPO/RTO and backup retention remain POL-11/13 decisions.

## Acceptance evidence still required

- Approved policy references and mapping manifest checksum/version (not its personal contents).
- Technical owner, reviewed SQL, application commit, target environment and rehearsal log.
- Before/after counts and identity/reference reconciliation; no unexpected grants or lost history.
- Successful authorization, recovery and encrypted-secret smoke checks.
- Backup/restore and rollback rehearsal with measured recovery against approved targets.
- HR and technical sign-off, with date and remaining constraints.

No live database inventory, migration, backup, restore or role conversion was performed by
preparing this document.


## ARCH-01 implementation increment — 2026-10-04

The additive foundation is implemented in source:
- `EvaluationRoleAssignment` links User to ADMIN/COMMITTEE/TEACHER with a composite primary
  key preventing duplicate grants and a restrictive User foreign key. Legacy `User.role` is retained.
- `lib/evaluation/permissions.ts` defines explicit entry capabilities with no role hierarchy,
  wildcard ADMIN permission, or automatic legacy-role mapping.
- `lib/auth/require-evaluation-capability.ts` reads current grants from the database after
  `requireUser()`, requiring an active undeleted account and an unrevoked, unexpired device
  session owned by that account. Missing device IDs fail closed on this new path.
- Tests cover combined responsibilities, partial revocation, inactive/unmapped accounts,
  legacy ADMIN isolation and the server guard's current-grant lookup.

Migration `20261004000000_add_evaluation_role_assignments` is generated and reviewed, **not
applied to a database**. It creates only the enum, relation, index and foreign key; it does
not backfill grants or alter existing identity/role rows. SQL was generated from the committed
and updated schemas without connecting to the runtime database. Deploy before using the guard.

Existing Portal consumers continue to use legacy authorization. No evaluation page/action is
wired yet; these capability checks are entry gates, not substitutes for future resource,
assignment, workflow or conflict checks. Review/reopen/finalize permissions await policy approval.
HR mapping, full consumer migration, database integration/constraint tests, restore rehearsal
and Phase 1 UI/access acceptance remain outstanding.


## Deployment and reference API update — 2026-10-04

Applied `20261004000000_add_evaluation_role_assignments` to the configured Supabase database
(schema `portal`) using Prisma migrate deploy. Prisma migrate status confirms all 10 migrations
are applied. This supersedes earlier "not applied" status notes; no role backfill was performed.

The project now includes the OVEC master-data API as an authorized external reference source.
Read-only authenticated catalogue and college-search calls returned HTTP 200; the college code
is `1354036401`. See [OVEC integration notes](OVEC-API.md) for the contract and boundaries.
Application API client/UI integration remains pending; official scoring policy still requires HR.
