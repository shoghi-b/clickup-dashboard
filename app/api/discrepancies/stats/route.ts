import { NextRequest, NextResponse } from 'next/server';
import { discrepancyService } from '@/lib/services/discrepancy-service';
import type { DiscrepancyRule, DiscrepancySeverity, DiscrepancyStats } from '@/lib/types/discrepancy';
import { startOfWeek, endOfWeek } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const weekStartParam = searchParams.get('weekStart');

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
            weekEnd
        );

        // Calculate stats
        const stats: DiscrepancyStats = {
            totalDiscrepancies: discrepancies.length,
            openDiscrepancies: discrepancies.filter(d => d.status === 'open').length,
            resolvedDiscrepancies: discrepancies.filter(d => d.status === 'resolved').length,
            byRule: {
                LOG_AFTER_EXIT: 0,
                NO_ATTENDANCE: 0,
                OUTSIDE_HOURS: 0,
                ZERO_PRESENCE: 0
            },
            bySeverity: {
                low: 0,
                medium: 0,
                high: 0
            }
        };

        discrepancies.forEach(d => {
            stats.byRule[d.rule as DiscrepancyRule]++;
            stats.bySeverity[d.severity as DiscrepancySeverity]++;
        });

        return NextResponse.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching discrepancy stats:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch discrepancy stats',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
