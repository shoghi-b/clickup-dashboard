
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchAttendanceData, processPunchData } from '@/lib/services/attendance-api';
import { randomUUID } from 'crypto';

import { addDays } from 'date-fns';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { startDate, endDate } = body;

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'startDate and endDate are required' },
                { status: 400 }
            );
        }

        const start = new Date(startDate);
        const end = new Date(endDate); // Proper DB end date

        // Add 1 day ONLY for the API fetch requirement
        const apiEnd = addDays(end, 1);

        // 1. Fetch data from external API using the extended range
        const punchData = await fetchAttendanceData(start, apiEnd);

        // 2. Process data into records
        const attendanceEntries = processPunchData(punchData);

        // 3. Save to database
        // We treat this sync similar to an upload, but we might want to distinguish it.
        // We'll reuse 'attendanceUpload' table to track this batch, but with a special filename or flag.
        const batchId = randomUUID();

        // Create "Upload" record for tracking
        await prisma.attendanceUpload.create({
            data: {
                id: batchId,
                fileName: `API_SYNC_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`,
                fileSize: 0, // Virtual file
                startDate: start,
                endDate: end,
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
            // Use createMany for bulk insertion
            await prisma.attendanceRecord.createMany({
                data: recordsToCreate,
                skipDuplicates: true,
            });
        }

        await prisma.syncLog.create({
            data: {
                syncType: 'ATTENDANCE_API',
                status: 'SUCCESS',
                startedAt: new Date(),
                completedAt: new Date(),
                recordsProcessed: attendanceEntries.length
            }
        });

        // Store last sync timestamp
        const now = new Date();
        await prisma.configuration.upsert({
            where: { key: 'last_sync_attendance' },
            update: { value: JSON.stringify(now.toISOString()) },
            create: {
                key: 'last_sync_attendance',
                value: JSON.stringify(now.toISOString()),
                description: 'Last successful attendance data sync timestamp'
            }
        });

        return NextResponse.json({
            success: true,
            count: attendanceEntries.length,
            batchId,
            lastSync: now.toISOString()
        });

    } catch (error) {
        console.error('Error syncing attendance:', error);

        await prisma.syncLog.create({
            data: {
                syncType: 'ATTENDANCE_API',
                status: 'FAILED',
                startedAt: new Date(),
                completedAt: new Date(),
                recordsProcessed: 0,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
        });

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to sync attendance' },
            { status: 500 }
        );
    }
}
