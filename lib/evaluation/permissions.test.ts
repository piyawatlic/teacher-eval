import { describe, expect, it } from "vitest";
import { EVALUATION_CAPABILITIES, hasEvaluationCapability } from "./permissions";
import type { EvaluationRole, UserStatus } from "@/lib/generated/prisma/enums";

const principal = (roles: EvaluationRole[], status: UserStatus = "ACTIVE") => ({
  id: "user", roles, status,
});

describe("evaluation capabilities", () => {
  it("combines teacher and committee responsibilities without a combined role", () => {
    const user = principal(["TEACHER", "COMMITTEE"]);
    expect(hasEvaluationCapability(user, "evaluations:score-assigned")).toBe(true);
    expect(hasEvaluationCapability(user, "results:read-own-published")).toBe(true);
    expect(hasEvaluationCapability(user, "assignments:manage")).toBe(false);
  });

  it("revoking committee leaves only teacher access", () => {
    const user = principal(["TEACHER"]);
    expect(hasEvaluationCapability(user, "evaluations:score-assigned")).toBe(false);
    expect(hasEvaluationCapability(user, "results:read-own-published")).toBe(true);
  });

  it("admin is not an implicit scorer or teacher", () => {
    const user = principal(["ADMIN"]);
    expect(hasEvaluationCapability(user, "records:manage")).toBe(true);
    expect(hasEvaluationCapability(user, "evaluations:score-assigned")).toBe(false);
    expect(hasEvaluationCapability(user, "results:read-own-published")).toBe(false);
  });

  it("grants nothing to an unmapped user", () => {
    for (const capability of EVALUATION_CAPABILITIES) {
      expect(hasEvaluationCapability(principal([]), capability)).toBe(false);
    }
  });

  it.each(["INVITED", "SUSPENDED"] as const)("denies all grants to %s accounts", (status) => {
    for (const capability of EVALUATION_CAPABILITIES) {
      expect(hasEvaluationCapability(principal(["ADMIN", "TEACHER", "COMMITTEE"], status), capability)).toBe(false);
    }
  });
});
