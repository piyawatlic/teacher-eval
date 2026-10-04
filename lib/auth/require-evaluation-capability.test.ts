import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), findFirst: vi.fn() }));
vi.mock("@/lib/auth/require-session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findFirst: mocks.findFirst } } }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

import { requireEvaluationCapability } from "./require-evaluation-capability";

describe("evaluation entry guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "u1", sid: "s1", role: "ADMIN" });
    mocks.findFirst.mockResolvedValue({
      id: "u1", status: "ACTIVE", evaluationRoles: [{ role: "TEACHER" }, { role: "COMMITTEE" }],
    });
  });

  it("returns current DB roles and scopes the device to its owner", async () => {
    const result = await requireEvaluationCapability("evaluations:score-assigned");
    expect(result.roles).toEqual(["TEACHER", "COMMITTEE"]);
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "u1", status: "ACTIVE", deletedAt: null,
        deviceSessions: { some: { id: "s1", revokedAt: null, expiresAt: { gt: expect.any(Date) } } },
      },
    }));
  });

  it("does not fall back to legacy ADMIN for unmapped accounts", async () => {
    mocks.findFirst.mockResolvedValue({ id: "u1", status: "ACTIVE", evaluationRoles: [] });
    await expect(requireEvaluationCapability("records:manage")).rejects.toThrow("redirect:/dashboard");
  });

  it("re-reads grants after revocation without trusting an earlier result", async () => {
    await requireEvaluationCapability("evaluations:score-assigned");
    mocks.findFirst.mockResolvedValue({ id: "u1", status: "ACTIVE", evaluationRoles: [{ role: "TEACHER" }] });
    await expect(requireEvaluationCapability("evaluations:score-assigned")).rejects.toThrow("redirect:/dashboard");
    expect((await requireEvaluationCapability("results:read-own-published")).roles).toEqual(["TEACHER"]);
  });

  it("rejects legacy sessions with no device id before querying grants", async () => {
    mocks.requireUser.mockResolvedValue({ id: "u1", sid: null, role: "ADMIN" });
    await expect(requireEvaluationCapability("records:manage")).rejects.toThrow("redirect:/signin");
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("rejects when the active account and valid owned device do not match", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(requireEvaluationCapability("evaluations:score-assigned")).rejects.toThrow("redirect:/signin");
  });
});
