-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clickupId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "profilePicture" TEXT,
    "role" TEXT,
    "expectedHoursPerDay" REAL NOT NULL DEFAULT 8.0,
    "expectedHoursPerWeek" REAL NOT NULL DEFAULT 40.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clickupId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "taskId" TEXT,
    "taskName" TEXT,
    "projectId" TEXT,
    "projectName" TEXT,
    "listId" TEXT,
    "listName" TEXT,
    "loggedAt" DATETIME NOT NULL,
    "isBackfilled" BOOLEAN NOT NULL DEFAULT false,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeEntry_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamMemberId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "totalHours" REAL NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "sameDayEntries" INTEGER NOT NULL,
    "backfilledEntries" INTEGER NOT NULL,
    "complianceStatus" TEXT NOT NULL,
    "meetsMinimum" BOOLEAN NOT NULL,
    "isSameDay" BOOLEAN NOT NULL,
    "utilizationPercent" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailySummary_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklySummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamMemberId" TEXT NOT NULL,
    "weekStartDate" DATETIME NOT NULL,
    "weekEndDate" DATETIME NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "totalHours" REAL NOT NULL,
    "activeDays" INTEGER NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "backfilledCount" INTEGER NOT NULL,
    "complianceStatus" TEXT NOT NULL,
    "meetsActiveThreshold" BOOLEAN NOT NULL,
    "limitedBackfilling" BOOLEAN NOT NULL,
    "utilizationPercent" REAL NOT NULL,
    "utilizationCategory" TEXT NOT NULL,
    "hasUnderLogging" BOOLEAN NOT NULL DEFAULT false,
    "hasOverwork" BOOLEAN NOT NULL DEFAULT false,
    "hasExcessiveBackfill" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklySummary_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
