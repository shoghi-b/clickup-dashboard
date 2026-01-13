import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Use provided date range or default to today
    let dayStart: Date;
    let dayEnd: Date;

    if (startDateParam && endDateParam) {
      dayStart = startOfDay(new Date(startDateParam));
      dayEnd = endOfDay(new Date(endDateParam));
    } else {
      const date = new Date();
      dayStart = startOfDay(date);
      dayEnd = endOfDay(date);
    }

    // Get total active team members
    const totalTeamMembers = await prisma.teamMember.count();

    // Get weekly summaries in the date range
    const weeklySummaries = await prisma.weeklySummary.findMany({
      where: {
        weekStartDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    // Calculate compliance rate
    let complianceRate = 0;
    if (weeklySummaries.length > 0) {
      const compliantCount = weeklySummaries.filter(
        (s) => s.complianceStatus === 'FULLY_COMPLIANT'
      ).length;
      complianceRate = Math.round((compliantCount / weeklySummaries.length) * 100);
    }

    // Calculate average utilization
    let avgUtilization = 0;
    if (weeklySummaries.length > 0) {
      const totalUtilization = weeklySummaries.reduce(
        (sum, s) => sum + s.utilizationPercent,
        0
      );
      avgUtilization = Math.round(totalUtilization / weeklySummaries.length);
    }

    // Get total hours tracked
    const totalHours = weeklySummaries.reduce(
      (sum, s) => sum + Number(s.totalHours),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        totalTeamMembers,
        complianceRate,
        avgUtilization,
        totalHours: Math.round(totalHours * 10) / 10,
        summaryCount: weeklySummaries.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

