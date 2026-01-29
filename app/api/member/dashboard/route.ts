import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let memberId: string;
        try {
            const sessionData = JSON.parse(
                Buffer.from(sessionCookie.value, 'base64').toString()
            );
            if (sessionData.role !== 'member') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            memberId = sessionData.id;
        } catch (e) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

        // 1. Fetch Member Details
        const member = await prisma.teamMember.findUnique({
            where: { id: memberId },
            select: {
                id: true,
                username: true,
                email: true,
                profilePicture: true,
                expectedHoursPerWeek: true,
            }
        });

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        // 2. Fetch Weekly Summary (Current Week)
        const currentWeekSummary = await prisma.weeklySummary.findFirst({
            where: {
                teamMemberId: memberId,
                weekStartDate: weekStart,
            }
        });

        // 3. Fetch Discrepancies (Open)
        const openDiscrepancies = await prisma.discrepancy.findMany({
            where: {
                teamMemberId: memberId,
                status: 'open',
            },
            orderBy: { date: 'desc' }
        });

        // 4. Fetch Last 4 Weeks Compliance Trend
        const fourWeeksAgo = subWeeks(weekStart, 4);
        const trendData = await prisma.weeklySummary.findMany({
            where: {
                teamMemberId: memberId,
                weekStartDate: { gte: fourWeeksAgo },
            },
            orderBy: { weekStartDate: 'asc' },
            select: {
                weekStartDate: true,
                complianceStatus: true,
                utilizationPercent: true,
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                member,
                currentWeek: {
                    totalHours: currentWeekSummary?.totalHours || 0,
                    utilization: currentWeekSummary?.utilizationPercent || 0,
                    compliance: currentWeekSummary?.complianceStatus || 'UNKNOWN',
                },
                openDiscrepancies,
                trend: trendData.map(t => ({
                    date: t.weekStartDate,
                    compliance: t.complianceStatus,
                    utilization: t.utilizationPercent,
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching member dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
