import type { EvaluationRole, UserStatus } from "@/lib/generated/prisma/enums";

/** Entry capabilities only. Resource/assignment/workflow checks are also mandatory. */
export const EVALUATION_CAPABILITIES = [
  "records:manage",
  "rounds:manage",
  "assignments:manage",
  "evaluations:score-assigned",
  "results:read-own-published",
] as const;
export type EvaluationCapability = (typeof EVALUATION_CAPABILITIES)[number];

// No hierarchy or wildcard. Review/reopen/finalize grants await POL-04/05.
const ROLE_CAPABILITIES: Record<EvaluationRole, readonly EvaluationCapability[]> = {
  ADMIN: ["records:manage", "rounds:manage", "assignments:manage"],
  COMMITTEE: ["evaluations:score-assigned"],
  TEACHER: ["results:read-own-published"],
};

export type EvaluationPrincipal = {
  id: string;
  status: UserStatus;
  roles: readonly EvaluationRole[];
};

export function hasEvaluationCapability(
  principal: EvaluationPrincipal,
  capability: EvaluationCapability,
): boolean {
  return principal.status === "ACTIVE" && principal.roles.some(
    (role) => ROLE_CAPABILITIES[role]?.includes(capability) === true,
  );
}
