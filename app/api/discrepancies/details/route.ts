import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, format } from 'date-fns';
import { DiscrepancyRule } from '@/lib/types/discrepancy';
import { WORKDAY_START, WORKDAY_END, parseTimeToMinutes } from '@/lib/services/discrepancy-service';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const discrepancyId = searchParams.get('id');

        if (!discrepancyId) {
            return NextResponse.json({ success: false, error: 'Discrepancy ID required' }, { status: 400 });
        }

        const discrepancy = await prisma.discrepancy.findUnique({
            where: { id: discrepancyId },
            include: {
                teamMember: true
            }
        });

        if (!discrepancy) {
            return NextResponse.json({ success: false, error: 'Discrepancy not found' }, { status: 404 });
        }

        const dayStart = startOfDay(new Date(discrepancy.date));
        const dayEnd = endOfDay(new Date(discrepancy.date));

        // Fetch all entries for the day first, then filter
        // This is efficient enough for a single user/day
        const allEntries = await prisma.timeEntry.findMany({
            where: {
                teamMemberId: discrepancy.teamMemberId,
                startDate: {
                    gte: dayStart,
                    lte: dayEnd
                }
            },
            orderBy: {
                startDate: 'asc'
            }
        });

        let relevantEntries = allEntries;

        // Filter based on rule
        switch (discrepancy.rule as DiscrepancyRule) {
            case 'LOG_AFTER_EXIT':
                // If metadata has taskId, filter for it
                try {
                    const meta = typeof discrepancy.metadata === 'string'
                        ? JSON.parse(discrepancy.metadata)
                        : discrepancy.metadata;

                    if (meta?.taskId) {
                        relevantEntries = allEntries.filter(e => e.taskId === meta.taskId);
                    } else if (meta?.logTime) {
                        // Fallback for older records: match by approximate time
                        // This is a heuristic
                        relevantEntries = allEntries.filter(e =>
                            format(new Date(e.loggedAt), 'HH:mm') === meta.logTime
                        );
                    }
                } catch (e) {
                    // Keep all if parsing fails
                }
                break;

            case 'NO_ATTENDANCE':
            case 'ZERO_PRESENCE':
                // All entries for the day are relevant as they constitute the "logging without presence"
                break;

            case 'OUTSIDE_HOURS':
                const startMin = parseTimeToMinutes(WORKDAY_START)!;
                const endMin = parseTimeToMinutes(WORKDAY_END)!;

                relevantEntries = allEntries.filter(entry => {
                    const logTime = format(new Date(entry.loggedAt), 'HH:mm');
                    const mins = parseTimeToMinutes(logTime);
                    if (mins === null) return false;
                    return mins < startMin || mins > endMin;
                });
                break;
        }

        return NextResponse.json({
            success: true,
            tasks: relevantEntries.map(e => ({
                id: e.id,
                taskId: e.taskId,
                taskName: e.taskName,
                loggedAt: e.loggedAt,
                duration: e.duration,
                projectName: e.projectName,
                clickupId: e.clickupId
            }))
        });

    } catch (error) {
        console.error('Error fetching discrepancy tasks:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
