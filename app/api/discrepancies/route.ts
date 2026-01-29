import { NextRequest, NextResponse } from 'next/server';
import { discrepancyService } from '@/lib/services/discrepancy-service';
import { startOfWeek, endOfWeek } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const weekStartParam = searchParams.get('weekStart');
        const statusParam = searchParams.get('status') as 'open' | 'resolved' | null;

        if (!weekStartParam) {
            return NextResponse.json(
                { error: 'weekStart parameter is required' },
                { status: 400 }
            );
        }

        const weekStart = startOfWeek(new Date(weekStartParam), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(new Date(weekStartParam), { weekStartsOn: 1 });

        const discrepancies = await discrepancyService.getDiscrepanciesForWeek(
            weekStart,
            weekEnd,
            statusParam || undefined
        );

        // Generate summary grouped by rule
        const summary = discrepancyService.generateDiscrepancySummary(discrepancies);

        return NextResponse.json({
            success: true,
            data: {
                discrepancies,
                summary,
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching discrepancies:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch discrepancies',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
