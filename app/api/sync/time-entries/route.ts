import { NextResponse } from 'next/server';
import { SyncService } from '@/lib/services/sync-service';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { subDays } from 'date-fns';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { startDate, endDate, assigneeId } = body;

    // Default to last 30 days if not specified
    const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();

    const syncService = new SyncService();
    const result = await syncService.syncTimeEntries(start, end, assigneeId);

    if (result.success) {
      // Recalculate analytics after sync
      const analyticsService = new AnalyticsService();
      await analyticsService.recalculateAllSummaries(start, end);

      return NextResponse.json({
        success: true,
        message: `Successfully synced ${result.count} time entries`,
        count: result.count,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
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

