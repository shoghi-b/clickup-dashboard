import { startOfWeek, endOfWeek, eachWeekOfInterval, format, subWeeks, isWithinInterval } from 'date-fns';
import { prisma } from '@/lib/prisma';
import type {
    MemberTrendReport,
    WeeklyMetricData,
    TrendIndicator,
    TrendAnalysisSummary,
    TrendPeriod,
    ComplianceMetrics,
} from '@/lib/types/report';
import { generateMemberComplianceReport } from './report-service';

/**
 * Generate trend analysis for specified team members
 */
export async function generateTrendAnalysis(
    memberIds: string[],
    weeks: TrendPeriod = 8
): Promise<{ reports: MemberTrendReport[]; summary: TrendAnalysisSummary }> {
    const endDate = new Date();
    const startDate = subWeeks(endDate, weeks);

    // Get all team members
    const members = await prisma.teamMember.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, username: true, profilePicture: true },
    });

    const reports: MemberTrendReport[] = [];

    for (const member of members) {
        const trendReport = await generateMemberTrendReport(member.id, member.username, member.profilePicture, startDate, endDate, weeks);
        reports.push(trendReport);
    }

    // Calculate summary
    const summary = calculateTrendSummary(reports, startDate, endDate, weeks);

    return { reports, summary };
}

/**
 * Generate trend report for a single member
 */
async function generateMemberTrendReport(
    memberId: string,
    memberName: string,
    profilePicture: string | null,
    startDate: Date,
    endDate: Date,
    totalWeeks: number
): Promise<MemberTrendReport> {
    // Get week intervals
    const weekIntervals = eachWeekOfInterval(
        { start: startDate, end: endDate },
        { weekStartsOn: 1 } // Monday
    ).slice(0, totalWeeks);

    const weeklyData: WeeklyMetricData[] = [];

    // Generate compliance report for each week
    for (let i = 0; i < weekIntervals.length; i++) {
        const weekStart = startOfWeek(weekIntervals[i], { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekIntervals[i], { weekStartsOn: 1 });

        // Use existing report service to get metrics for this week
        const weekReport = await generateMemberComplianceReport(memberId, weekStart, weekEnd);

        if (!weekReport) {
            // Skip this week if no data available
            continue;
        }

        weeklyData.push({
            weekStart,
            weekEnd,
            weekLabel: `Week of ${format(weekStart, 'MMM d')}`,
            weekNumber: i + 1,
            metrics: weekReport.metrics,
        });
    }

    // Calculate trends for each metric
    const trends = {
        lateCheckins: calculateTrendIndicator(weeklyData.map(w => w.metrics.lateCheckins)),
        superLateCheckins: calculateTrendIndicator(weeklyData.map(w => w.metrics.superLateCheckins)),
        insufficientHoursBoth: calculateTrendIndicator(weeklyData.map(w => w.metrics.insufficientHoursBoth)),
        outsideOfficeWork: calculateTrendIndicator(weeklyData.map(w => w.metrics.outsideOfficeWork)),
        lessThan8hOffice: calculateTrendIndicator(weeklyData.map(w => w.metrics.lessThan8hOffice)),
        superLateWithOfficeButLowWork: calculateTrendIndicator(weeklyData.map(w => w.metrics.superLateWithOfficeButLowWork)),
        superLateWithOfficeAndGoodWork: calculateTrendIndicator(weeklyData.map(w => w.metrics.superLateWithOfficeAndGoodWork)),
    };

    // Determine overall status based on key metrics
    const overallStatus = determineOverallStatus(trends);

    return {
        memberId,
        memberName,
        profilePicture,
        weeklyData,
        trends,
        overallStatus,
    };
}

/**
 * Calculate trend indicator for a metric
 */
function calculateTrendIndicator(weeklyValues: number[]): TrendIndicator {
    if (weeklyValues.length < 2) {
        return {
            direction: 'stable',
            percentageChange: 0,
            currentWeekValue: weeklyValues[weeklyValues.length - 1] || 0,
            previousWeekValue: 0,
            averageValue: weeklyValues[0] || 0,
        };
    }

    const currentWeekValue = weeklyValues[weeklyValues.length - 1];
    const previousWeekValue = weeklyValues[weeklyValues.length - 2];
    const averageValue = weeklyValues.reduce((sum, val) => sum + val, 0) / weeklyValues.length;

    // Calculate percentage change (negative means improvement for violations)
    let percentageChange = 0;
    if (previousWeekValue > 0) {
        percentageChange = ((currentWeekValue - previousWeekValue) / previousWeekValue) * 100;
    } else if (currentWeekValue > 0) {
        percentageChange = 100; // New violations appeared
    }

    // Determine direction (for violations, decrease is improvement)
    let direction: 'improving' | 'declining' | 'stable';
    if (percentageChange < -10) {
        direction = 'improving'; // Violations decreased by >10%
    } else if (percentageChange > 10) {
        direction = 'declining'; // Violations increased by >10%
    } else {
        direction = 'stable';
    }

    return {
        direction,
        percentageChange,
        currentWeekValue,
        previousWeekValue,
        averageValue: Math.round(averageValue * 10) / 10, // Round to 1 decimal
    };
}

/**
 * Determine overall status based on key metrics
 */
function determineOverallStatus(trends: MemberTrendReport['trends']): 'improving' | 'declining' | 'stable' {
    // Weight key metrics more heavily
    const keyMetrics = [
        trends.lateCheckins,
        trends.superLateCheckins,
        trends.insufficientHoursBoth,
        trends.lessThan8hOffice,
    ];

    const improvingCount = keyMetrics.filter(t => t.direction === 'improving').length;
    const decliningCount = keyMetrics.filter(t => t.direction === 'declining').length;

    if (improvingCount > decliningCount) {
        return 'improving';
    } else if (decliningCount > improvingCount) {
        return 'declining';
    } else {
        return 'stable';
    }
}

/**
 * Calculate summary statistics for trend analysis
 */
function calculateTrendSummary(
    reports: MemberTrendReport[],
    startDate: Date,
    endDate: Date,
    totalWeeks: number
): TrendAnalysisSummary {
    const improvingMembers = reports.filter(r => r.overallStatus === 'improving').length;
    const decliningMembers = reports.filter(r => r.overallStatus === 'declining').length;
    const stableMembers = reports.filter(r => r.overallStatus === 'stable').length;

    return {
        totalMembers: reports.length,
        periodStart: startDate,
        periodEnd: endDate,
        totalWeeks,
        improvingMembers,
        decliningMembers,
        stableMembers,
    };
}
