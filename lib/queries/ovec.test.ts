import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ guard: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/auth/require-session", () => ({ requireAdmin: mocks.guard }));
vi.mock("@/lib/ovec/client", async (original) => ({ ...await original<typeof import("@/lib/ovec/client")>(), listOvecColleges: mocks.list }));
import { getCollegeReferences } from "./ovec";
import { OvecError } from "@/lib/ovec/client";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue({ id: "admin" });
  mocks.list.mockResolvedValue({ data: [], meta: { totalCount: 0, limit: 20, offset: 0, hasNextPage: false } });
});
it("blocks upstream requests when authorization fails", async () => {
  mocks.guard.mockRejectedValue(new Error("denied"));
  await expect(getCollegeReferences({})).rejects.toThrow("denied");
  expect(mocks.list).not.toHaveBeenCalled();
});
it("maps URL filters to deterministic pagination", async () => {
  await getCollegeReferences({ search: " ลอง ", status: "inactive", page: "3" });
  expect(mocks.list).toHaveBeenCalledWith({ search: "ลอง", isActive: false, limit: 20, offset: 40, orderBy: "code", order: "asc" });
});
it("normalizes tampered pagination and status", async () => {
  const result = await getCollegeReferences({ page: "Infinity", status: "bad", search: ["x", "y"] });
  expect(result.filters).toEqual({ search: "", status: "active", page: 1 });
});
it("rejects oversized queries before the network call", async () => {
  expect((await getCollegeReferences({ search: "x".repeat(201) })).error).toBeTruthy();
  expect(mocks.list).not.toHaveBeenCalled();
});
it("renders service failure distinctly from empty search results", async () => {
  mocks.list.mockRejectedValue(new OvecError("UNAVAILABLE"));
  const result = await getCollegeReferences({});
  expect(result.result).toBeNull();
  expect(result.error).toContain("ไม่พร้อมใช้งาน");
});
it("does not hide unexpected programming errors", async () => {
  mocks.list.mockRejectedValue(new Error("bug"));
  await expect(getCollegeReferences({})).rejects.toThrow("bug");
});
