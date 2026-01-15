import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodType = searchParams.get('periodType') || 'WEEKLY';
    const date = searchParams.get('date');

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

    // Fetch team KPI summary
    const teamKPI = await prisma.teamKPISummary.findUnique({
      where: {
        periodType_periodStart: {
          periodType: periodType as any,
          periodStart,
        },
      },
    });

    if (!teamKPI) {
      return NextResponse.json({
        success: false,
        error: 'No KPI data found for this period. Please calculate KPIs first.',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: teamKPI,
    });
  } catch (error) {
    console.error('Fetch team KPI error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team KPIs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

