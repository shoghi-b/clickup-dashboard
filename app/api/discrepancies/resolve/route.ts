import { NextRequest, NextResponse } from 'next/server';
import { discrepancyService } from '@/lib/services/discrepancy-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { discrepancyId, reason, note } = body;

        if (!discrepancyId || !reason) {
            return NextResponse.json(
                { error: 'discrepancyId and reason are required' },
                { status: 400 }
            );
        }

        const resolved = await discrepancyService.resolveDiscrepancy(
            discrepancyId,
            reason,
            note
        );

        return NextResponse.json({
            success: true,
            data: resolved
        });
    } catch (error) {
        console.error('Error resolving discrepancy:', error);
        return NextResponse.json(
            {
                error: 'Failed to resolve discrepancy',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
