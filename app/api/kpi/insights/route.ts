import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodType = searchParams.get('periodType') || 'WEEKLY';
    const date = searchParams.get('date');
    const scope = searchParams.get('scope'); // TEAM or MEMBER
    const severity = searchParams.get('severity'); // INFO, WARNING, CRITICAL
    const category = searchParams.get('category'); // ACCOUNTABILITY, CAPACITY, RISK, GENERAL

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

    if (scope) {
      where.scope = scope;
    }

    if (severity) {
      where.severity = severity;
    }

    if (category) {
      where.category = category;
    }

    // Fetch insights
    const insights = await prisma.insight.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Parse JSON fields
    const parsedInsights = insights.map(insight => ({
      ...insight,
      metrics: insight.metrics ? JSON.parse(insight.metrics) : null,
      suggestedActions: insight.suggestedActions ? JSON.parse(insight.suggestedActions) : null,
    }));

    // Calculate summary
    const summary = {
      total: insights.length,
      critical: insights.filter(i => i.severity === 'CRITICAL').length,
      warning: insights.filter(i => i.severity === 'WARNING').length,
      info: insights.filter(i => i.severity === 'INFO').length,
      accountability: insights.filter(i => i.category === 'ACCOUNTABILITY').length,
      capacity: insights.filter(i => i.category === 'CAPACITY').length,
      risk: insights.filter(i => i.category === 'RISK').length,
      general: insights.filter(i => i.category === 'GENERAL').length,
      acknowledged: insights.filter(i => i.acknowledged).length,
      unacknowledged: insights.filter(i => !i.acknowledged).length,
    };

    return NextResponse.json({
      success: true,
      data: parsedInsights,
      summary,
    });
  } catch (error) {
    console.error('Fetch insights error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch insights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Acknowledge an insight
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { insightId, acknowledgedBy } = body;

    if (!insightId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insight ID is required',
        },
        { status: 400 }
      );
    }

    const insight = await prisma.insight.update({
      where: { id: insightId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: acknowledgedBy || 'Unknown',
      },
    });

    return NextResponse.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    console.error('Acknowledge insight error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to acknowledge insight',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

