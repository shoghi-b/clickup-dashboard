import { NextRequest, NextResponse } from 'next/server';
import { reportService } from '@/lib/services/report-service';
import { parseISO } from 'date-fns';

/**
 * GET /api/reports/member-compliance
 * Generate compliance reports for selected team members
 * 
 * Query Parameters:
 * - memberIds: comma-separated team member IDs
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        // Parse query parameters
        const memberIdsParam = searchParams.get('memberIds');
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        // Validate required parameters
        if (!memberIdsParam || !startDateParam || !endDateParam) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required parameters: memberIds, startDate, endDate',
                },
                { status: 400 }
            );
        }

        // Parse member IDs
        const memberIds = memberIdsParam.split(',').map(id => id.trim()).filter(Boolean);

        if (memberIds.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'At least one member ID is required',
                },
                { status: 400 }
            );
        }

        // Parse dates
        let startDate: Date;
        let endDate: Date;

        try {
            startDate = parseISO(startDateParam);
            endDate = parseISO(endDateParam);
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid date format. Use ISO date strings (YYYY-MM-DD)',
                },
                { status: 400 }
            );
        }

        // Validate date range
        if (startDate > endDate) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Start date must be before or equal to end date',
                },
                { status: 400 }
            );
        }

        // Generate reports
        const reports = await reportService.generateTeamComplianceReport(
            memberIds,
            startDate,
            endDate
        );

        // Calculate summary statistics
        const summary = {
            totalMembers: reports.length,
            periodStart: startDate,
            periodEnd: endDate,
            totalWorkDays: reports[0]?.totalWorkDays || 0,
            aggregateMetrics: {
                totalLateCheckins: reports.reduce((sum, r) => sum + r.metrics.lateCheckins, 0),
                totalSuperLateCheckins: reports.reduce((sum, r) => sum + r.metrics.superLateCheckins, 0),
                totalInsufficientHoursBoth: reports.reduce((sum, r) => sum + r.metrics.insufficientHoursBoth, 0),
                totalOutsideOfficeWork: reports.reduce((sum, r) => sum + r.metrics.outsideOfficeWork, 0),
                totalNoDataDays: reports.reduce((sum, r) => sum + r.metrics.noDataDays, 0),
                totalSuperLateWithOfficeButLowWork: reports.reduce((sum, r) => sum + r.metrics.superLateWithOfficeButLowWork, 0),
                totalSuperLateWithOfficeAndGoodWork: reports.reduce((sum, r) => sum + r.metrics.superLateWithOfficeAndGoodWork, 0),
                totalLessThan8hOffice: reports.reduce((sum, r) => sum + r.metrics.lessThan8hOffice, 0),
            },
        };

        return NextResponse.json({
            success: true,
            data: reports,
            summary,
        });

    } catch (error) {
        console.error('Error generating compliance reports:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to generate compliance reports',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
