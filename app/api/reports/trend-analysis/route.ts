import { NextRequest, NextResponse } from 'next/server';
import { generateTrendAnalysis } from '@/lib/services/trend-service';
import type { TrendPeriod } from '@/lib/types/report';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        // Get parameters
        const memberIdsParam = searchParams.get('memberIds');
        const weeksParam = searchParams.get('weeks');

        // Validate memberIds
        if (!memberIdsParam) {
            return NextResponse.json(
                { success: false, error: 'memberIds parameter is required' },
                { status: 400 }
            );
        }

        const memberIds = memberIdsParam.split(',').filter(id => id.trim());
        if (memberIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'At least one member ID is required' },
                { status: 400 }
            );
        }

        // Validate weeks parameter
        const weeks = weeksParam ? parseInt(weeksParam) : 8;
        if (![4, 8, 12].includes(weeks)) {
            return NextResponse.json(
                { success: false, error: 'weeks must be 4, 8, or 12' },
                { status: 400 }
            );
        }

        // Generate trend analysis
        const { reports, summary } = await generateTrendAnalysis(memberIds, weeks as TrendPeriod);

        return NextResponse.json({
            success: true,
            data: reports,
            summary,
        });
    } catch (error) {
        console.error('Error generating trend analysis:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate trend analysis' },
            { status: 500 }
        );
    }
}
