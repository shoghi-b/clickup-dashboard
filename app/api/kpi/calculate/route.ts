import { NextRequest, NextResponse } from 'next/server';
import { kpiService } from '@/lib/services/kpi-service';
import { insightsService } from '@/lib/services/insights-service';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodType, date } = body;

    if (!periodType || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(periodType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid period type. Must be DAILY, WEEKLY, or MONTHLY',
        },
        { status: 400 }
      );
    }

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
        throw new Error('Invalid period type');
    }

    // Calculate team KPIs
    await kpiService.calculateTeamKPISummary(periodType as any, periodStart, periodEnd);

    // Generate insights
    await insightsService.generateInsights({
      periodType: periodType as any,
      periodStart,
      periodEnd,
    });

    return NextResponse.json({
      success: true,
      message: 'KPIs calculated and insights generated successfully',
      period: {
        type: periodType,
        start: periodStart,
        end: periodEnd,
      },
    });
  } catch (error) {
    console.error('KPI calculation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate KPIs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

