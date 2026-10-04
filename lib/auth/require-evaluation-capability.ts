import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";
import {
  hasEvaluationCapability,
  type EvaluationCapability,
  type EvaluationPrincipal,
} from "@/lib/evaluation/permissions";

/**
 * Session-based entry guard for future evaluation pages/actions/queries.
 * Always load current grants; never read legacy role or JWT role claims.
 * Callers must additionally scope resources by owner/assignment and workflow.
 * Machine APIs must use a separate authenticated path, not redirect guards.
 */
export async function requireEvaluationCapability(
  capability: EvaluationCapability,
): Promise<EvaluationPrincipal> {
  const sessionUser = await requireUser();
  // Legacy sessions without a device id cannot enter evaluation surfaces.
  if (!sessionUser.sid) redirect("/signin");

  const user = await prisma.user.findFirst({
    where: {
      id: sessionUser.id,
      status: "ACTIVE",
      deletedAt: null,
      deviceSessions: {
        some: {
          id: sessionUser.sid,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      },
    },
    select: {
      id: true,
      status: true,
      evaluationRoles: { select: { role: true } },
    },
  });
  if (!user) redirect("/signin");

  const principal: EvaluationPrincipal = {
    id: user.id,
    status: user.status,
    roles: user.evaluationRoles.map(({ role }) => role),
  };
  if (!hasEvaluationCapability(principal, capability)) redirect("/dashboard");
  return principal;
}
