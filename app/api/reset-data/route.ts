import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (!type || (type !== 'clickup' && type !== 'attendance')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid reset type. Must be "clickup" or "attendance"'
        },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    if (type === 'clickup') {
      // Delete all ClickUp time tracking data
      // Delete in order: TimeEntry, DailySummary, WeeklySummary (due to foreign key constraints)
      const [timeEntries, dailySummaries, weeklySummaries] = await Promise.all([
        prisma.timeEntry.deleteMany({}),
        prisma.dailySummary.deleteMany({}),
        prisma.weeklySummary.deleteMany({})
      ]);

      deletedCount = timeEntries.count + dailySummaries.count + weeklySummaries.count;

      console.log(`Deleted ${timeEntries.count} time entries, ${dailySummaries.count} daily summaries, ${weeklySummaries.count} weekly summaries`);
    } else if (type === 'attendance') {
      // Delete all attendance data
      const [attendanceRecords, attendanceUploads] = await Promise.all([
        prisma.attendanceRecord.deleteMany({}),
        prisma.attendanceUpload.deleteMany({})
      ]);

      deletedCount = attendanceRecords.count + attendanceUploads.count;

      console.log(`Deleted ${attendanceRecords.count} attendance records, ${attendanceUploads.count} upload records`);
    }

    return NextResponse.json({
      success: true,
      type,
      deletedCount,
      message: `Successfully deleted ${deletedCount} ${type} records`
    });

  } catch (error) {
    console.error('Reset data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

