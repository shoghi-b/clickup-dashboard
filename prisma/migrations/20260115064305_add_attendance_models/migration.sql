-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeName" TEXT NOT NULL,
    "employeeCode" TEXT,
    "date" DATETIME NOT NULL,
    "firstIn" TEXT,
    "lastOut" TEXT,
    "totalHours" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "shift" TEXT,
    "workPlusOT" TEXT,
    "uploadBatchId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AttendanceUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "presentCount" INTEGER NOT NULL DEFAULT 0,
    "absentCount" INTEGER NOT NULL DEFAULT 0,
    "partialCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
