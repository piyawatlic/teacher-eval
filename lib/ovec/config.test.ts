import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.stubEnv("OVEC_API_URL", undefined);
  vi.stubEnv("OVEC_API_KEY", undefined);
  vi.resetModules();
});

it.each(["http://ovec-api.eleccom.in.th", "https://other.invalid", "https://user:pass@ovec-api.eleccom.in.th", "https://ovec-api.eleccom.in.th/path", "https://ovec-api.eleccom.in.th/?key=secret"])("rejects unsafe OVEC origin %s", async (url) => {
  vi.resetModules();
  vi.stubEnv("OVEC_API_URL", url);
  await expect(import("@/lib/env")).rejects.toThrow("OVEC_API_URL must be");
});

it("allows an unconfigured integration without breaking application startup", async () => {
  vi.resetModules();
  vi.stubEnv("OVEC_API_URL", "");
  vi.stubEnv("OVEC_API_KEY", "");
  const { env } = await import("@/lib/env");
  expect(env.OVEC_API_URL).toBeUndefined();
  expect(env.OVEC_API_KEY).toBeUndefined();
});
