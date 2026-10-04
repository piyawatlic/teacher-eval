-- CreateEnum
CREATE TYPE "EvaluationRole" AS ENUM ('ADMIN', 'COMMITTEE', 'TEACHER');

-- CreateTable
CREATE TABLE "EvaluationRoleAssignment" (
    "userId" TEXT NOT NULL,
    "role" "EvaluationRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationRoleAssignment_pkey" PRIMARY KEY ("userId","role")
);

-- CreateIndex
CREATE INDEX "EvaluationRoleAssignment_role_idx" ON "EvaluationRoleAssignment"("role");

-- AddForeignKey
ALTER TABLE "EvaluationRoleAssignment" ADD CONSTRAINT "EvaluationRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

