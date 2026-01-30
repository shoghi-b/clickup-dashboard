-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "clickupId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "profilePicture" TEXT,
    "role" TEXT,
    "password" TEXT,
    "expectedHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "expectedHoursPerWeek" DOUBLE PRECISION NOT NULL DEFAULT 40.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "clickupId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "taskId" TEXT,
    "taskName" TEXT,
    "projectId" TEXT,
    "projectName" TEXT,
    "listId" TEXT,
    "listName" TEXT,
    "spaceId" TEXT,
    "spaceName" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL,
    "isBackfilled" BOOLEAN NOT NULL DEFAULT false,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "sameDayEntries" INTEGER NOT NULL,
    "backfilledEntries" INTEGER NOT NULL,
    "complianceStatus" TEXT NOT NULL,
    "meetsMinimum" BOOLEAN NOT NULL,
    "isSameDay" BOOLEAN NOT NULL,
    "utilizationPercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySummary" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "activeDays" INTEGER NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "backfilledCount" INTEGER NOT NULL,
    "complianceStatus" TEXT NOT NULL,
    "meetsActiveThreshold" BOOLEAN NOT NULL,
    "limitedBackfilling" BOOLEAN NOT NULL,
    "utilizationPercent" DOUBLE PRECISION NOT NULL,
    "utilizationCategory" TEXT NOT NULL,
    "hasUnderLogging" BOOLEAN NOT NULL DEFAULT false,
    "hasOverwork" BOOLEAN NOT NULL DEFAULT false,
    "hasExcessiveBackfill" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeCode" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "inOutPeriods" TEXT,
    "unpairedIns" TEXT,
    "unpairedOuts" TEXT,
    "firstIn" TEXT,
    "lastOut" TEXT,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "shift" TEXT,
    "workPlusOT" TEXT,
    "uploadBatchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceUpload" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "presentCount" INTEGER NOT NULL DEFAULT 0,
    "absentCount" INTEGER NOT NULL DEFAULT 0,
    "partialCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamKPISummary" (
    "id" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "attendanceComplianceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timesheetComplianceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "presentNotLoggedCount" INTEGER NOT NULL DEFAULT 0,
    "avgUtilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overCapacityCount" INTEGER NOT NULL DEFAULT 0,
    "underCapacityCount" INTEGER NOT NULL DEFAULT 0,
    "lateLoggingCount" INTEGER NOT NULL DEFAULT 0,
    "zeroHourDaysCount" INTEGER NOT NULL DEFAULT 0,
    "weekendLoggingCount" INTEGER NOT NULL DEFAULT 0,
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "activeMembersCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamKPISummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberKPISummary" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "attendanceCompliance" BOOLEAN NOT NULL DEFAULT false,
    "timesheetCompliance" BOOLEAN NOT NULL DEFAULT false,
    "presentNotLogged" BOOLEAN NOT NULL DEFAULT false,
    "attendanceDays" INTEGER NOT NULL DEFAULT 0,
    "expectedWorkDays" INTEGER NOT NULL DEFAULT 0,
    "utilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilizationStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "totalHoursLogged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberKPISummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT,
    "periodType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metrics" TEXT,
    "suggestedActions" TEXT,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discrepancy" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rule" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "minutesInvolved" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedReason" TEXT,
    "resolvedNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discrepancy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_clickupId_key" ON "TeamMember"("clickupId");

-- CreateIndex
CREATE INDEX "TeamMember_clickupId_idx" ON "TeamMember"("clickupId");

-- CreateIndex
CREATE INDEX "TeamMember_email_idx" ON "TeamMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_clickupId_key" ON "TimeEntry"("clickupId");

-- CreateIndex
CREATE INDEX "TimeEntry_teamMemberId_idx" ON "TimeEntry"("teamMemberId");

-- CreateIndex
CREATE INDEX "TimeEntry_startDate_idx" ON "TimeEntry"("startDate");

-- CreateIndex
CREATE INDEX "TimeEntry_taskId_idx" ON "TimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");

-- CreateIndex
CREATE INDEX "DailySummary_date_idx" ON "DailySummary"("date");

-- CreateIndex
CREATE INDEX "DailySummary_complianceStatus_idx" ON "DailySummary"("complianceStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummary_teamMemberId_date_key" ON "DailySummary"("teamMemberId", "date");

-- CreateIndex
CREATE INDEX "WeeklySummary_weekStartDate_idx" ON "WeeklySummary"("weekStartDate");

-- CreateIndex
CREATE INDEX "WeeklySummary_complianceStatus_idx" ON "WeeklySummary"("complianceStatus");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySummary_teamMemberId_year_weekNumber_key" ON "WeeklySummary"("teamMemberId", "year", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_key_key" ON "Configuration"("key");

-- CreateIndex
CREATE INDEX "SyncLog_syncType_idx" ON "SyncLog"("syncType");

-- CreateIndex
CREATE INDEX "SyncLog_status_idx" ON "SyncLog"("status");

-- CreateIndex
CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "AttendanceRecord_employeeName_idx" ON "AttendanceRecord"("employeeName");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_status_idx" ON "AttendanceRecord"("status");

-- CreateIndex
CREATE INDEX "AttendanceRecord_uploadBatchId_idx" ON "AttendanceRecord"("uploadBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_employeeName_date_uploadBatchId_key" ON "AttendanceRecord"("employeeName", "date", "uploadBatchId");

-- CreateIndex
CREATE INDEX "AttendanceUpload_status_idx" ON "AttendanceUpload"("status");

-- CreateIndex
CREATE INDEX "AttendanceUpload_createdAt_idx" ON "AttendanceUpload"("createdAt");

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

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySummary" ADD CONSTRAINT "WeeklySummary_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberKPISummary" ADD CONSTRAINT "MemberKPISummary_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discrepancy" ADD CONSTRAINT "Discrepancy_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
