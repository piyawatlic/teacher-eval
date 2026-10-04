# OVEC master-data integration

Requested and verified 2026-10-04. Documentation:
[Master Data สอศ. API reference](https://ovec-api-admin.eleccom.in.th/).
Production API origin configured for this project: `https://ovec-api.eleccom.in.th`.
The documentation's localhost URL is a development example.

## Authentication and requests

Read `OVEC_API_URL` and `OVEC_API_KEY` from server environment only. Send the key as
`Authorization: Bearer <key>`. Never put it in a URL, a NEXT_PUBLIC variable, client props,
logs or committed examples. API keys support reads; this integration does not write master data.

REST contract:

- `GET /api/v1`: live resource catalogue.
- `GET /api/v1/<resource>`: paginated list, optionally filtered.
- `GET /api/v1/<resource>/<code>`: individual record by natural code, not internal ID.
- List parameters: `search`, `isActive`, `limit` (default 50, maximum 200), `offset`,
  `orderBy`, `order` (`asc`/`desc`) and declared foreign-key filters such as `provinceId`.
- List responses contain `data` and `meta` with `totalCount`, `limit`, `offset`, `hasNextPage`.
  Foreign-key filters use referenced IDs; do not substitute a natural code without resolving it.

GraphQL reads use `POST /graphql`; lists expose `items` and `totalCount` and can resolve nested
relations. REST is sufficient for initial reference pickers. GraphQL was documented but not
smoke-tested in this session.

## Verified calls

Using the configured key, both requests returned HTTP 200:

1. `GET /api/v1` — 22 resource types, including geography, colleges, organizations, curricula,
   program branches/majors, code sets/values, administrative divisions/work units, plans,
   strategies, objectives, standards and evaluation issues. The live catalogue includes more
   entries than the public documentation's static table; consult it when adding a resource.
2. `GET /api/v1/colleges?search=วิทยาลัยการอาชีพลอง&limit=5` — exactly one match:
   **วิทยาลัยการอาชีพลอง / Long Industrial and Community Education College**, code
   **1354036401**, `isActive: true`.

Only the required identity fields are recorded here; full upstream metadata is not copied.

## Application integration boundary

Use this API as the reference source for college, geographic and vocational-government codes.
Keep local evaluation accounts, staff profiles, assignments, scores and workflow history in
this application's database. An upstream curriculum branch or administrative unit must not
silently become a local teacher department without confirming its meaning.

Implement server-side reads with validated resource/filter inputs, bounded pagination, timeout,
explicit handling of unavailable/unauthorized responses, and no authenticated cross-origin
redirects. Return only fields needed by the UI. Do not mirror whole upstream tables by default;
retain approved identifiers and immutable report snapshots when historical accuracy requires it.
Upstream changes must not rewrite published reports. Master-data access does not approve a rubric:
`standards` and `evaluation-issues` remain subject to HR policy confirmation before use as criteria.

The server-only application client is implemented in `lib/ovec/client.ts`:

- `getOvecCatalogue()` returns resource names and labels.
- `listOvecColleges({ search, isActive, limit, offset, provinceId, orderBy, order })` returns a
  validated page. Only `code`/`nameTh` ordering is currently exposed.
- `getOvecCollege(code)` returns `id`, `code`, `nameTh`, nullable `nameEn` and `isActive`.
- `OvecError.code` distinguishes missing configuration, unauthorized access, missing records,
  rate limiting, unavailability and invalid responses. Input validation errors reject before fetch.

Requests use a 10-second timeout, no-store caching and redirect rejection. Configuration is
optional for application startup; requests require both variables. The server environment parser
restricts the endpoint to the intended HTTPS origin. No upstream error body is returned or logged.
The `server-only` marker prevents browser imports. UI/page/action callers must apply their own
session/capability guards; this library does not expose a public proxy endpoint.

Tests use mocked fetch and dummy credentials, never `.env` or the network. Validation on
2026-10-04: 63 tests across 7 files passed; typecheck passed; lint has one existing image warning.
UI consumers, general reference pickers and further resource-specific DTOs remain pending.

Live smoke check through the implemented client also passed: `getOvecCollege("1354036401")`
returned the expected active วิทยาลัยการอาชีพลอง record using the configured server key.


## First UI consumer

`/admin/reference-data` is a read-only Portal ADMIN reference browser linked from AdminSidebar.
Its cached query (`lib/queries/ovec.ts`) calls `requireAdmin()` before reaching OVEC; it does not
use legacy ADMIN to infer evaluation grants. GET form filters live in the URL, reset pagination
on new searches, and preserve filters on next/previous links. Service failures remain distinct
from zero matches. No raw upstream metadata or credentials are sent to the client.

Production build and 69 tests pass; browser visual acceptance remains pending.
