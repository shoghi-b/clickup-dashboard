import { NextResponse } from 'next/server';
import { SyncService } from '@/lib/services/sync-service';
import { fetchAttendanceData, processPunchData } from '@/lib/services/attendance-api';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { prisma } from '@/lib/prisma';
import { addDays, startOfDay, subDays } from 'date-fns';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic'; // Ensure this route is not cached

export async function GET(request: Request) {
    try {
        // 1. Authorization Check
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const logs: string[] = [];

        // --- Sync 1: Team Members ---
        logs.push('Starting Team Member Sync...');
        const syncService = new SyncService();
        await syncService.syncTeamMembers();
        logs.push('Team Member Sync Completed.');

        // --- Sync 2: ClickUp Time Entries (Last 2 Days) ---
        logs.push('Starting ClickUp Time Entry Sync...');
        // Sync from 2 days ago to end of today to catch backlogs and updates
        const clickupStart = subDays(startOfDay(now), 2);
        const clickupEnd = now;

        await syncService.syncTimeEntries(clickupStart, clickupEnd);

        // Update ClickUp Last Sync Timestamp
        await prisma.configuration.upsert({
            where: { key: 'last_sync_clickup' },
            update: { value: JSON.stringify(now.toISOString()) },
            create: {
                key: 'last_sync_clickup',
                value: JSON.stringify(now.toISOString()),
                description: 'Last successful ClickUp data sync timestamp'
            }
        });
        logs.push('ClickUp Time Entry Sync Completed.');

        // --- Sync 3: Attendance Data (Today) ---
        logs.push('Starting Attendance Data Sync...');
        // Attendance API requires EndDate to be +1 day to capture full current day
        // Attendance API requires EndDate to be +1 day to capture full current day
        const attendanceStart = startOfDay(now);
        const attendanceDbEnd = endOfDay(now); // Strict end of today for DB
        const attendanceApiEnd = addDays(startOfDay(now), 1); // +1 Day for API

        const punchData = await fetchAttendanceData(attendanceStart, attendanceApiEnd);
        const attendanceEntries = processPunchData(punchData); // Use processPunchData directly

        // Use a consistent Batch ID for this sync
        const batchId = randomUUID();

        // Create "Upload" record for tracking (same logic as manual sync)
        await prisma.attendanceUpload.create({
            data: {
                id: batchId,
                fileName: `CRON_SYNC_${attendanceStart.toISOString().split('T')[0]}`,
                fileSize: 0,
                startDate: attendanceStart,
                endDate: attendanceDbEnd,
                totalRecords: attendanceEntries.length,
                status: 'COMPLETED',
                presentCount: attendanceEntries.filter(e => e.status === 'PRESENT').length,
                absentCount: attendanceEntries.filter(e => e.status === 'ABSENT').length,
                partialCount: attendanceEntries.filter(e => e.status === 'PARTIAL').length,
            }
        });

        const recordsToCreate = attendanceEntries.map(entry => ({
            employeeName: entry.employeeName,
            employeeCode: entry.employeeCode,
            date: entry.date,
            inOutPeriods: JSON.stringify(entry.inOutPeriods),
            unpairedIns: JSON.stringify(entry.unpairedIns),
            unpairedOuts: JSON.stringify(entry.unpairedOuts),
            firstIn: entry.firstIn,
            lastOut: entry.lastOut,
            totalHours: entry.totalHours,
            status: entry.status,
            shift: entry.shift,
            workPlusOT: entry.workPlusOT,
            uploadBatchId: batchId,
        }));

        if (recordsToCreate.length > 0) {
            // Delete existing records for the day to ensure updates (e.g. Partial -> Present)
            await prisma.attendanceRecord.deleteMany({
                where: {
                    date: {
                        gte: attendanceStart,
                        lte: attendanceDbEnd
                    }
                }
            });

            await prisma.attendanceRecord.createMany({
                data: recordsToCreate,
            });
        }

        // Update Attendance Last Sync Timestamp
        await prisma.configuration.upsert({
            where: { key: 'last_sync_attendance' },
            update: { value: JSON.stringify(now.toISOString()) },
            create: {
                key: 'last_sync_attendance',
                value: JSON.stringify(now.toISOString()),
                description: 'Last successful attendance data sync timestamp'
            }
        });
        logs.push(`Attendance Data Sync Completed. Processed ${recordsToCreate.length} records.`);


        // --- Sync 4: Analytics Recalculation ---
        logs.push('Starting Analytics Recalculation...');
        const analyticsService = new AnalyticsService();
        // Recalculate for the affected range (start of ClickUp sync window to now)
        await analyticsService.recalculateAllSummaries(clickupStart, now);
        logs.push('Analytics Recalculation Completed.');


        // --- Final Log ---
        await prisma.syncLog.create({
            data: {
                syncType: 'FULL_CRON_SYNC',
                status: 'SUCCESS',
                startedAt: now,
                completedAt: new Date(),
                recordsProcessed: 0, // difficult to sum up disparate record types
                errorMessage: logs.join('\n')
            }
        });

        return NextResponse.json({
            success: true,
            timestamp: now.toISOString(),
            logs
        });

    } catch (error) {
        console.error('Cron Sync Failed:', error);

        await prisma.syncLog.create({
            data: {
                syncType: 'FULL_CRON_SYNC',
                status: 'FAILED',
                startedAt: new Date(),
                completedAt: new Date(),
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
        });

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
