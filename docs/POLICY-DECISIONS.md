# Phase 0 — HR decision register

Status: **HR policy approvals pending; multi-role architecture selected (ARCH-01)**. Source: [SRS §6](../SRs.md).
No approver, approval date or official form has been supplied. Suggestions below are discussion
inputs only; they must not become production defaults or seeded official criteria.

| ID | Decision/evidence HR must provide | Gate | Status |
|---|---|---|---|
| POL-01 | Attach official form/version; list each category/criterion, meaning, minimum, maximum, weight, required comment/evidence rule | R3 / round opening | Pending |
| POL-02 | Specify eligible submitted evaluations, minimum committee count, missing/withdrawn treatment, aggregation formula, decimal precision and rounding order. Arithmetic mean is a proposal only. Include worked examples. | R4–5 scoring | Pending |
| POL-03 | Provide result bands, inclusive/exclusive boundaries and rounding-before/after-classification rules; examples at every boundary | R3–6 | Pending |
| POL-04 | Name review/approve/finalize authorities; distinguish technical admin from HR; separation of scorer and approver | R1 authorization / R5 | Pending |
| POL-05 | Specify reopen authority, required reason, revision history, reassignment/withdrawal after drafting/submission, post-publication correction and appeal process | R3–5 | Pending |
| POL-06 | Approve transitions for round, individual evaluation and teacher result separately; completion denominator, committee quorum, publication per teacher versus whole round | R2–5 / R6 publication | Pending |
| POL-07 | Define academic/Buddhist year convention, unique round identifier, timezone, inclusive date boundaries and late editing/submission. Asia/Bangkok is a proposal, not acceptance. | R2–4 | Pending |
| POL-08 | Visibility matrix for draft/final scores, committee names and comments; teacher view, other committee members and exports | R4–6 | Pending |
| POL-09 | Provisioning, public signup, Google admission/linking, username/email login, recovery channel, session duration and remember-me. Invitation-only is recommended for review. | R1 staff access | Pending |
| POL-10 | Multi-role architecture selected in ARCH-01; HR must confirm allowed combinations, self-assessment/conflict of interest, external committee members and deactivation effect on drafts/submitted work | R1 role design / R3 assignments / R8 | Pending |
| POL-11 | Retention, backups, privacy notice, audit access, erasure/anonymization and incident owner. Legacy 30-day deletion/365-day audit guidance is not college policy. | R8 | Pending |
| POL-12 | Approved Thai report specimen, headings, date wording, signatories, export columns, PDF delivery method and delivery phase; explicitly accept/reject browser print-to-PDF | R6 / FR-32 allocation | Pending |
| POL-13 | Expected teacher/committee/round counts, concurrent load, response targets, browsers/devices, recovery time and recovery point targets | R8 | Pending |
| POL-14 | Event-to-recipient matrix, read/dismiss behavior, overdue reminders and configurable report/permission/notification scope | R6–7 | Pending |

## Recorded project direction — ARCH-01 (2026-10-04)

Source: the project user's direction in this working session. Select multi-role assignments
separate from identity, capability-based authorization, and additive migration retaining legacy
role data through acceptance and the rollback window. See [design and acceptance cases](MIGRATION-PLAN.md#arch-01--multi-role-identity-and-capability-authorization).
This resolves the schema direction within POL-10; it does not approve individual account
mappings, allowed role combinations in practice, conflicts of interest or POL-04 authorities.
Implementation owner: Phase 1 development; HR approval identity/date remain pending.
Affected requirements: DR-01, NFR-01–03/11, FR-03 and SRS §2.3.

## Record a decision

Create one record for each POL ID (or a clearly identified group). Keep superseded decisions
for traceability. Store sensitive personnel material outside the repository; reference its
controlled location/version rather than committing it.

- POL ID:
- Status: Pending / Approved / Approved deferral / Superseded
- Exact decision and applicable scope:
- Official source, version and controlled location:
- Worked examples / report specimen / acceptance cases:
- Approver name and authority:
- Approval date (ISO date):
- Effective date/version:
- Implementation owner and affected FR/BR/DR/NFR:
- If deferred: reason, owner, deadline and gate that must remain closed:
- Supersedes / superseded by:

A developer may prepare this record but cannot supply HR approval on HR's behalf. After approval,
update the SRS and roadmap with the decision reference, and implement tests against the approved
examples. Resolve POL-04/09/10 before committing a production access model; do not infer a role
mapping from existing Portal accounts.
