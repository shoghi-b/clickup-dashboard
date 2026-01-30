import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const teamMemberId = searchParams.get('teamMemberId');

    // Use provided date range or default to today
    let dayStart: Date;
    let dayEnd: Date;

    if (startDateParam && endDateParam) {
      // Parse dates as YYYY-MM-DD in local timezone
      const [startYear, startMonth, startDay] = startDateParam.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDateParam.split('-').map(Number);
      dayStart = startOfDay(new Date(startYear, startMonth - 1, startDay));
      dayEnd = endOfDay(new Date(endYear, endMonth - 1, endDay));
    } else {
      const date = new Date();
      dayStart = startOfDay(date);
      dayEnd = endOfDay(date);
    }

    const where: any = {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    };

    if (teamMemberId) {
      where.teamMemberId = teamMemberId;
    }

    const dailySummaries = await prisma.dailySummary.findMany({
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
        { date: 'desc' },
        { teamMember: { username: 'asc' } },
      ],
    });

    return NextResponse.json({
      success: true,
      data: dailySummaries,
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

