import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teamMemberId = searchParams.get('teamMemberId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date'); // For single day queries

    if (!teamMemberId) {
      return NextResponse.json(
        { success: false, error: 'teamMemberId is required' },
        { status: 400 }
      );
    }

    // Build date filter
    let dateFilter: any = {};
    if (date) {
      // Single day query - parse date as YYYY-MM-DD in local timezone
      const [year, month, day] = date.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      dateFilter = {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      };
    } else if (startDate && endDate) {
      // Date range query - parse dates as YYYY-MM-DD in local timezone
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
      const parsedStartDate = new Date(startYear, startMonth - 1, startDay);
      const parsedEndDate = new Date(endYear, endMonth - 1, endDay);
      dateFilter = {
        gte: startOfDay(parsedStartDate),
        lte: endOfDay(parsedEndDate),
      };
    } else {
      return NextResponse.json(
        { success: false, error: 'Either date or startDate/endDate is required' },
        { status: 400 }
      );
    }

    // Fetch time entries for the member and date range
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        teamMemberId,
        startDate: dateFilter,
      },
      orderBy: [
        { startDate: 'asc' },
      ],
    });

    // Sort in memory by spaceName and listName
    timeEntries.sort((a, b) => {
      const spaceCompare = (a.spaceName || '').localeCompare(b.spaceName || '');
      if (spaceCompare !== 0) return spaceCompare;
      const listCompare = (a.listName || '').localeCompare(b.listName || '');
      if (listCompare !== 0) return listCompare;
      return a.startDate.getTime() - b.startDate.getTime();
    });

    // Group by space and list (project)
    const projectBreakdown: {
      [spaceKey: string]: {
        spaceName: string;
        spaceId: string | null;
        totalHours: number;
        lists: {
          [listKey: string]: {
            listName: string;
            listId: string | null;
            totalHours: number;
            entryCount: number;
            entries: Array<{
              id: string;
              taskName: string | null;
              duration: number;
              hours: number;
              startDate: string;
              endDate: string | null;
            }>;
          };
        };
      };
    } = {};

    let totalHours = 0;

    for (const entry of timeEntries) {
      const hours = entry.duration / (1000 * 60 * 60); // Convert milliseconds to hours
      totalHours += hours;

      const spaceKey = entry.spaceId || 'no-space';
      const spaceName = entry.spaceName || 'No Space';
      const listKey = entry.listId || 'no-list';
      const listName = entry.listName || 'No List';

      // Initialize space if not exists
      if (!projectBreakdown[spaceKey]) {
        projectBreakdown[spaceKey] = {
          spaceName,
          spaceId: entry.spaceId,
          totalHours: 0,
          lists: {},
        };
      }

      // Initialize list if not exists
      if (!projectBreakdown[spaceKey].lists[listKey]) {
        projectBreakdown[spaceKey].lists[listKey] = {
          listName,
          listId: entry.listId,
          totalHours: 0,
          entryCount: 0,
          entries: [],
        };
      }

      // Add entry to list
      projectBreakdown[spaceKey].lists[listKey].entries.push({
        id: entry.id,
        taskName: entry.taskName,
        duration: entry.duration,
        hours,
        startDate: entry.startDate.toISOString(),
        endDate: entry.endDate?.toISOString() || null,
      });

      projectBreakdown[spaceKey].lists[listKey].totalHours += hours;
      projectBreakdown[spaceKey].lists[listKey].entryCount += 1;
      projectBreakdown[spaceKey].totalHours += hours;
    }

    // Convert to array format for easier consumption
    const spaces = Object.entries(projectBreakdown).map(([spaceKey, spaceData]) => ({
      spaceId: spaceData.spaceId,
      spaceName: spaceData.spaceName,
      totalHours: spaceData.totalHours,
      lists: Object.entries(spaceData.lists).map(([listKey, listData]) => ({
        listId: listData.listId,
        listName: listData.listName,
        totalHours: listData.totalHours,
        entryCount: listData.entryCount,
        entries: listData.entries,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalHours,
        totalEntries: timeEntries.length,
        spaces,
      },
    });
  } catch (error) {
    console.error('Error fetching project breakdown:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

