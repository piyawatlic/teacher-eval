import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";

export type OvecErrorCode = "NOT_CONFIGURED" | "UNAUTHORIZED" | "NOT_FOUND" | "RATE_LIMITED" | "UNAVAILABLE" | "INVALID_RESPONSE";
export class OvecError extends Error {
  constructor(public readonly code: OvecErrorCode) {
    super(`OVEC reference service: ${code}`);
    this.name = "OvecError";
  }
}

const collegeSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  nameTh: z.string().min(1),
  nameEn: z.string().nullable(),
  isActive: z.boolean(),
});
export type OvecCollege = z.infer<typeof collegeSchema>;

const paginationSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(200),
  offset: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
});
const collegePageSchema = z.object({ data: z.array(collegeSchema), meta: paginationSchema });

const collegeFiltersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().nonnegative().default(0),
  provinceId: z.string().trim().min(1).max(100).optional(),
  orderBy: z.enum(["code", "nameTh"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
}).strict();
export type OvecCollegeFilters = z.input<typeof collegeFiltersSchema>;

const catalogueSchema = z.object({
  data: z.object({
    version: z.string(),
    resources: z.array(z.object({ name: z.string(), label: z.string() })),
  }),
});

async function request<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  if (!env.OVEC_API_URL || !env.OVEC_API_KEY) throw new OvecError("NOT_CONFIGURED");
  let response: Response;
  try {
    response = await fetch(new URL(path, env.OVEC_API_URL), {
      method: "GET",
      headers: { Authorization: `Bearer ${env.OVEC_API_KEY}`, Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Never propagate fetch errors: they may contain request/credential details.
    throw new OvecError("UNAVAILABLE");
  }
  if (response.status === 401 || response.status === 403) throw new OvecError("UNAUTHORIZED");
  if (response.status === 404) throw new OvecError("NOT_FOUND");
  if (response.status === 429) throw new OvecError("RATE_LIMITED");
  if (!response.ok) throw new OvecError("UNAVAILABLE");
  try {
    // Zod strips extra upstream metadata; callers receive only the declared DTO.
    return schema.parse(await response.json());
  } catch {
    throw new OvecError("INVALID_RESPONSE");
  }
}

/** Internal server library; callers must authenticate/authorize their own surface. */
export async function listOvecColleges(filters: OvecCollegeFilters = {}) {
  const values = collegeFiltersSchema.parse(filters);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return request(`/api/v1/colleges?${query}`, collegePageSchema);
}

export async function getOvecCollege(code: string): Promise<OvecCollege> {
  // Natural codes are a single safe path segment, never arbitrary URLs/paths.
  const validated = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).parse(code);
  return (await request(`/api/v1/colleges/${validated}`, z.object({ data: collegeSchema }))).data;
}

export async function getOvecCatalogue() {
  return (await request("/api/v1", catalogueSchema)).data;
}
