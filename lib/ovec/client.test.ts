import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const config = vi.hoisted(() => ({
  OVEC_API_URL: "https://ovec-api.eleccom.in.th" as string | undefined,
  OVEC_API_KEY: "unit-key" as string | undefined,
}));
vi.mock("@/lib/env", () => ({ env: config }));
import { getOvecCatalogue, getOvecCollege, listOvecColleges } from "./client";

const college = { id: "c1", code: "1354036401", nameTh: "วิทยาลัยการอาชีพลอง", nameEn: null, isActive: true };
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  config.OVEC_API_URL = "https://ovec-api.eleccom.in.th";
  config.OVEC_API_KEY = "unit-key";
});
afterEach(() => vi.unstubAllGlobals());

describe("OVEC read client", () => {
  it("encodes Thai search and pagination, uses bearer auth and prevents redirects", async () => {
    fetchMock.mockResolvedValue(Response.json({
      data: [{ ...college, metadata: { private: "omit" } }],
      meta: { totalCount: 1, limit: 5, offset: 0, hasNextPage: false },
    }));
    const result = await listOvecColleges({ search: college.nameTh, limit: 5, isActive: true });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.origin).toBe(config.OVEC_API_URL);
    expect(url.searchParams.get("search")).toBe(college.nameTh);
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("offset")).toBe("0");
    expect(options).toMatchObject({ method: "GET", redirect: "error", cache: "no-store", headers: { Authorization: "Bearer unit-key" } });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(result.data).toEqual([college]);
  });

  it("looks up by natural code and strips extra fields", async () => {
    fetchMock.mockResolvedValue(Response.json({ data: { ...college, metadata: {} } }));
    expect(await getOvecCollege(college.code)).toEqual(college);
    expect(fetchMock.mock.calls[0][0].pathname).toBe(`/api/v1/colleges/${college.code}`);
  });

  it("returns a minimal live catalogue without following upstream links", async () => {
    fetchMock.mockResolvedValue(Response.json({ data: { version: "v1", resources: [{ name: "colleges", label: "สถานศึกษา", list: "https://untrusted.invalid" }] } }));
    expect(await getOvecCatalogue()).toEqual({ version: "v1", resources: [{ name: "colleges", label: "สถานศึกษา" }] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([0, 201, 1.5])("rejects invalid page size %s before a request", async (limit) => {
    await expect(listOvecColleges({ limit })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["../secret", "https://other.invalid", "a/b", ""])("rejects unsafe record code %s", async (code) => {
    await expect(getOvecCollege(code)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails explicitly without configured credentials", async () => {
    config.OVEC_API_KEY = undefined;
    await expect(getOvecCatalogue()).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([[401, "UNAUTHORIZED"], [403, "UNAUTHORIZED"], [404, "NOT_FOUND"], [429, "RATE_LIMITED"], [500, "UNAVAILABLE"]])("maps HTTP %s without exposing the response", async (status, code) => {
    fetchMock.mockResolvedValue(new Response("sensitive upstream error", { status: Number(status) }));
    await expect(getOvecCatalogue()).rejects.toMatchObject({ code, message: `OVEC reference service: ${code}` });
  });

  it("sanitizes transport/timeout errors", async () => {
    fetchMock.mockRejectedValue(new Error("request contained unit-key"));
    await expect(getOvecCatalogue()).rejects.toMatchObject({ code: "UNAVAILABLE", message: "OVEC reference service: UNAVAILABLE" });
  });

  it.each([{}, { data: [college], meta: { limit: 999 } }])("rejects malformed data", async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(listOvecColleges()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("rejects non-JSON success responses", async () => {
    fetchMock.mockResolvedValue(new Response("<html>error</html>"));
    await expect(getOvecCatalogue()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
