import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const teamMemberId = searchParams.get('teamMemberId');

    // Use provided date range or default to current week
    let weekStart: Date;
    let weekEnd: Date;

    if (startDateParam && endDateParam) {
      weekStart = new Date(startDateParam);
      weekEnd = new Date(endDateParam);
    } else {
      const date = new Date();
      weekStart = startOfWeek(date, { weekStartsOn: 1 });
      weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    }

    const where: any = {
      weekStartDate: {
        gte: weekStart,
        lte: weekEnd,
      },
    };

    if (teamMemberId) {
      where.teamMemberId = teamMemberId;
    }

    const weeklySummaries = await prisma.weeklySummary.findMany({
      where,
      include: {
        teamMember: {
          select: {
            id: true,
            username: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: [
        { weekStartDate: 'desc' },
        { teamMember: { username: 'asc' } },
      ],
    });

    return NextResponse.json({
      success: true,
      data: weeklySummaries,
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

