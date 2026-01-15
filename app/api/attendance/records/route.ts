import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeName = searchParams.get('employeeName');
    
    // Build where clause
    const where: any = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: startOfDay(new Date(startDate)),
        lte: endOfDay(new Date(endDate))
      };
    }
    
    if (employeeName) {
      where.employeeName = {
        contains: employeeName,
        mode: 'insensitive'
      };
    }
    
    // Fetch attendance records
    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: [
        { employeeName: 'asc' },
        { date: 'asc' }
      ]
    });
    
    // Group by employee
    const groupedByEmployee = records.reduce((acc, record) => {
      if (!acc[record.employeeName]) {
        acc[record.employeeName] = [];
      }
      acc[record.employeeName].push(record);
      return acc;
    }, {} as Record<string, typeof records>);
    
    // Calculate summary statistics
    const summary = {
      totalRecords: records.length,
      totalEmployees: Object.keys(groupedByEmployee).length,
      presentCount: records.filter(r => r.status === 'PRESENT').length,
      absentCount: records.filter(r => r.status === 'ABSENT').length,
      partialCount: records.filter(r => r.status === 'PARTIAL').length,
      totalHours: records.reduce((sum, r) => sum + r.totalHours, 0),
      averageHoursPerDay: records.length > 0 
        ? records.reduce((sum, r) => sum + r.totalHours, 0) / records.filter(r => r.status === 'PRESENT').length
        : 0
    };
    
    return NextResponse.json({
      success: true,
      records,
      groupedByEmployee,
      summary
    });
    
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch attendance records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

