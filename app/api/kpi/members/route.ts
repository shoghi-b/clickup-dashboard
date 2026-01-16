import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodType = searchParams.get('periodType') || 'WEEKLY';
    const date = searchParams.get('date');
    const riskLevel = searchParams.get('riskLevel'); // Filter by risk level
    const teamMemberId = searchParams.get('teamMemberId'); // Filter by specific member

    const targetDate = date ? new Date(date) : new Date();
    let periodStart: Date;
    let periodEnd: Date;

    // Determine period boundaries
    switch (periodType) {
      case 'DAILY':
        periodStart = startOfDay(targetDate);
        periodEnd = endOfDay(targetDate);
        break;
      case 'WEEKLY':
        periodStart = startOfWeek(targetDate, { weekStartsOn: 1 });
        periodEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
        break;
      case 'MONTHLY':
        periodStart = startOfMonth(targetDate);
        periodEnd = endOfMonth(targetDate);
        break;
      default:
        periodStart = startOfWeek(targetDate, { weekStartsOn: 1 });
        periodEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    }

    // Build where clause
    const where: any = {
      periodType: periodType as any,
      periodStart,
    };

    if (riskLevel) {
      where.riskLevel = riskLevel;
    }

    if (teamMemberId) {
      where.teamMemberId = teamMemberId;
    }

    // Fetch member KPI summaries
    const memberKPIs = await prisma.memberKPISummary.findMany({
      where,
      include: {
        teamMember: {
          select: {
            id: true,
            username: true,
            email: true,
            profilePicture: true,
            role: true,
            expectedHoursPerDay: true,
            expectedHoursPerWeek: true,
          },
        },
      },
      orderBy: [
        { riskLevel: 'desc' },
        { teamMember: { username: 'asc' } },
      ],
    });

    // Calculate summary statistics
    const summary = {
      totalMembers: memberKPIs.length,
      lowRisk: memberKPIs.filter((m) => m.riskLevel === 'LOW').length,
      mediumRisk: memberKPIs.filter((m) => m.riskLevel === 'MEDIUM').length,
      highRisk: memberKPIs.filter((m) => m.riskLevel === 'HIGH').length,
      criticalRisk: memberKPIs.filter((m) => m.riskLevel === 'CRITICAL').length,
      attendanceCompliant: memberKPIs.filter((m) => m.attendanceCompliance).length,
      timesheetCompliant: memberKPIs.filter((m) => m.timesheetCompliance).length,
      presentNotLogged: memberKPIs.filter((m) => m.presentNotLogged).length,
      overCapacity: memberKPIs.filter((m) => m.utilizationStatus === 'OVER').length,
      underCapacity: memberKPIs.filter((m) => m.utilizationStatus === 'UNDER').length,
      healthyCapacity: memberKPIs.filter((m) => m.utilizationStatus === 'HEALTHY').length,
    };

    return NextResponse.json({
      success: true,
      data: memberKPIs,
      summary,
    });
  } catch (error) {
    console.error('Fetch member KPIs error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch member KPIs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

