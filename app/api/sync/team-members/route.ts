import { NextResponse } from 'next/server';
import { SyncService } from '@/lib/services/sync-service';

export async function POST() {
  try {
    const syncService = new SyncService();
    const result = await syncService.syncTeamMembers();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully synced ${result.count} team members`,
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

