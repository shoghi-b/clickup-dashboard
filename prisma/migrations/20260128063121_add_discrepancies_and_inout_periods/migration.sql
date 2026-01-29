-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN "inOutPeriods" TEXT;

-- CreateTable
CREATE TABLE "Discrepancy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamMemberId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "rule" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "minutesInvolved" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedReason" TEXT,
    "resolvedNote" TEXT,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Discrepancy_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Discrepancy_teamMemberId_idx" ON "Discrepancy"("teamMemberId");

-- CreateIndex
CREATE INDEX "Discrepancy_date_idx" ON "Discrepancy"("date");

-- CreateIndex
CREATE INDEX "Discrepancy_rule_idx" ON "Discrepancy"("rule");

-- CreateIndex
CREATE INDEX "Discrepancy_status_idx" ON "Discrepancy"("status");

-- CreateIndex
CREATE INDEX "Discrepancy_severity_idx" ON "Discrepancy"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "Discrepancy_teamMemberId_date_rule_key" ON "Discrepancy"("teamMemberId", "date", "rule");
