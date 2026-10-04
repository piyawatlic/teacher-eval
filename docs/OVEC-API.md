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

Connection and lookup are verified; an application client and UI consumers are not yet implemented.
