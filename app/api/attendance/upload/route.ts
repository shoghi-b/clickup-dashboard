import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseAttendanceFile } from '@/lib/services/attendance-parser';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an XLS or XLSX file.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse date range if provided
    let dateRange: { start: Date; end: Date } | undefined;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    // Parse the attendance file
    const parsedData = parseAttendanceFile(buffer, dateRange);

    // Generate upload batch ID
    const uploadBatchId = randomUUID();

    // Create upload record
    const upload = await prisma.attendanceUpload.create({
      data: {
        id: uploadBatchId,
        fileName: file.name,
        fileSize: file.size,
        startDate: parsedData.dateRange.start,
        endDate: parsedData.dateRange.end,
        totalRecords: parsedData.totalRecords,
        presentCount: 0,
        absentCount: 0,
        partialCount: 0,
        status: 'PROCESSING'
      }
    });

    // Prepare all records for bulk insertion
    const allRecords: any[] = [];
    let presentCount = 0;
    let absentCount = 0;
    let partialCount = 0;

    for (const [employeeName, entries] of parsedData.employees) {
      for (const entry of entries) {
        allRecords.push({
          employeeName: entry.employeeName,
          employeeCode: entry.employeeCode,
          date: entry.date,
          inOutPeriods: JSON.stringify(entry.inOutPeriods),
          unpairedIns: JSON.stringify([]),  // File parsing doesn't compute unpaired, only API sync does
          unpairedOuts: JSON.stringify([]), // File parsing doesn't compute unpaired, only API sync does
          firstIn: entry.firstIn,
          lastOut: entry.lastOut,
          totalHours: entry.totalHours,
          status: entry.status,
          shift: entry.shift,
          workPlusOT: entry.workPlusOT,
          uploadBatchId,
          // Add default timestamps if schema requires them and database doesn't auto-set on createMany (Prisma usually handles this but good to be safe if strictly required by types, though Prisma Client types usually have optional createdAt)
        });

        // Count statuses
        if (entry.status === 'PRESENT') presentCount++;
        else if (entry.status === 'ABSENT') absentCount++;
        else if (entry.status === 'PARTIAL') partialCount++;
      }
    }

    if (allRecords.length > 0) {
      // Use createMany for bulk insertion (Performance Check: Postgres supports this well)
      await prisma.attendanceRecord.createMany({
        data: allRecords,
        skipDuplicates: true, // Optional: safer in case of re-uploads or partial failures
      });
    }

    // Update upload record with counts
    await prisma.attendanceUpload.update({
      where: { id: uploadBatchId },
      data: {
        presentCount,
        absentCount,
        partialCount,
        status: 'COMPLETED'
      }
    });

    // Create sync log
    await prisma.syncLog.create({
      data: {
        syncType: 'ATTENDANCE',
        status: 'SUCCESS',
        startedAt: new Date(),
        completedAt: new Date(),
        recordsProcessed: parsedData.totalRecords
      }
    });

    return NextResponse.json({
      success: true,
      uploadId: uploadBatchId,
      summary: {
        totalRecords: parsedData.totalRecords,
        presentCount,
        absentCount,
        partialCount,
        employeeCount: parsedData.employees.size,
        dateRange: parsedData.dateRange
      }
    });

  } catch (error) {
    console.error('========================================');
    console.error('Error uploading attendance:');
    console.error('Error object:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    console.error('========================================');

    return NextResponse.json(
      {
        error: 'Failed to process attendance file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

