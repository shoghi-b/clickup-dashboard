-- CreateTable
CREATE TABLE "TeamKPISummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodType" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "attendanceComplianceRate" REAL NOT NULL DEFAULT 0,
    "timesheetComplianceRate" REAL NOT NULL DEFAULT 0,
    "presentNotLoggedCount" INTEGER NOT NULL DEFAULT 0,
    "avgUtilization" REAL NOT NULL DEFAULT 0,
    "overCapacityCount" INTEGER NOT NULL DEFAULT 0,
    "underCapacityCount" INTEGER NOT NULL DEFAULT 0,
    "lateLoggingCount" INTEGER NOT NULL DEFAULT 0,
    "zeroHourDaysCount" INTEGER NOT NULL DEFAULT 0,
    "weekendLoggingCount" INTEGER NOT NULL DEFAULT 0,
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "activeMembersCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MemberKPISummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamMemberId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "attendanceCompliance" BOOLEAN NOT NULL DEFAULT false,
    "timesheetCompliance" BOOLEAN NOT NULL DEFAULT false,
    "presentNotLogged" BOOLEAN NOT NULL DEFAULT false,
    "attendanceDays" INTEGER NOT NULL DEFAULT 0,
    "expectedWorkDays" INTEGER NOT NULL DEFAULT 0,
    "utilization" REAL NOT NULL DEFAULT 0,
    "utilizationStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "totalHoursLogged" REAL NOT NULL DEFAULT 0,
    "expectedHours" REAL NOT NULL DEFAULT 0,
    "lateLoggingDays" INTEGER NOT NULL DEFAULT 0,
    "zeroHourDays" INTEGER NOT NULL DEFAULT 0,
    "weekendLoggingDays" INTEGER NOT NULL DEFAULT 0,
    "consecutiveZeroDays" INTEGER NOT NULL DEFAULT 0,
    "hasLateLoggingRisk" BOOLEAN NOT NULL DEFAULT false,
    "hasZeroHourRisk" BOOLEAN NOT NULL DEFAULT false,
    "hasWeekendRisk" BOOLEAN NOT NULL DEFAULT false,
    "hasBurnoutRisk" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "actionRequired" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemberKPISummary_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT,
    "periodType" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metrics" TEXT,
    "suggestedActions" TEXT,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "acknowledgedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "TeamKPISummary_periodType_idx" ON "TeamKPISummary"("periodType");

-- CreateIndex
CREATE INDEX "TeamKPISummary_periodStart_idx" ON "TeamKPISummary"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "TeamKPISummary_periodType_periodStart_key" ON "TeamKPISummary"("periodType", "periodStart");

-- CreateIndex
CREATE INDEX "MemberKPISummary_teamMemberId_idx" ON "MemberKPISummary"("teamMemberId");

-- CreateIndex
CREATE INDEX "MemberKPISummary_periodType_idx" ON "MemberKPISummary"("periodType");

-- CreateIndex
CREATE INDEX "MemberKPISummary_periodStart_idx" ON "MemberKPISummary"("periodStart");

-- CreateIndex
CREATE INDEX "MemberKPISummary_riskLevel_idx" ON "MemberKPISummary"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "MemberKPISummary_teamMemberId_periodType_periodStart_key" ON "MemberKPISummary"("teamMemberId", "periodType", "periodStart");

-- CreateIndex
CREATE INDEX "Insight_scope_idx" ON "Insight"("scope");

-- CreateIndex
CREATE INDEX "Insight_periodStart_idx" ON "Insight"("periodStart");

-- CreateIndex
CREATE INDEX "Insight_category_idx" ON "Insight"("category");

-- CreateIndex
CREATE INDEX "Insight_severity_idx" ON "Insight"("severity");

-- CreateIndex
CREATE INDEX "Insight_acknowledged_idx" ON "Insight"("acknowledged");
