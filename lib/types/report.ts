// Report Types for Compliance Reporting

export type ReportPeriod = '1_DAY' | '7_DAYS' | '14_DAYS' | '30_DAYS' | 'LAST_MONTH' | 'THIS_MONTH' | 'CUSTOM';

export interface ComplianceMetrics {
    // Late check-ins (after 10:30 AM)
    lateCheckins: number;
    lateCheckinDates: DateDetail[];

    // Super late check-ins (after 10:45 AM)
    superLateCheckins: number;
    superLateCheckinDates: DateDetail[];

    // Days with <8h office time AND <8h ClickUp time
    insufficientHoursBoth: number;
    insufficientHoursDates: DateDetail[];

    // Days with <8h office time BUT >=8h ClickUp time (outside office work)
    outsideOfficeWork: number;
    outsideWorkDates: DateDetail[];

    // Days with no ClickUp & no Attendance data (potential leave)
    noDataDays: number;
    noDataDates: string[];

    // Super late + stayed 8h+ in office + worked <8h
    superLateWithOfficeButLowWork: number;
    superLateWithOfficeButLowWorkDates: DateDetail[];

    // Super late + stayed 8h+ in office + worked 8h+
    superLateWithOfficeAndGoodWork: number;
    superLateWithOfficeAndGoodWorkDates: DateDetail[];

    // Days with <8h office time (regardless of ClickUp hours)
    lessThan8hOffice: number;
    lessThan8hOfficeDates: DateDetail[];
}

export interface DateDetail {
    date: string;                   // ISO date string
    value: string | number;         // Contextual value (e.g., check-in time, hours)
    attendanceHours?: number;
    clickupHours?: number;
}

export interface MemberComplianceReport {
    memberId: string;
    memberName: string;
    profilePicture: string | null;
    periodStart: Date;
    periodEnd: Date;
    totalWorkDays: number;
    metrics: ComplianceMetrics;
}

export interface ReportFilters {
    period: ReportPeriod;
    startDate: Date;
    endDate: Date;
    memberIds: string[];
}

export interface ReportSummary {
    totalMembers: number;
    periodStart: Date;
    periodEnd: Date;
    totalWorkDays: number;
    aggregateMetrics: {
        totalLateCheckins: number;
        totalSuperLateCheckins: number;
        totalInsufficientHoursBoth: number;
        totalOutsideOfficeWork: number;
        totalNoDataDays: number;
        totalSuperLateWithOfficeButLowWork: number;
        totalSuperLateWithOfficeAndGoodWork: number;
        totalLessThan8hOffice: number;
    };
}

// Trend Analysis Types

export interface WeeklyMetricData {
    weekStart: Date;
    weekEnd: Date;
    weekLabel: string; // e.g., "Week of Jan 1"
    weekNumber: number; // 1-based index
    metrics: ComplianceMetrics;
}

export interface TrendIndicator {
    direction: 'improving' | 'declining' | 'stable';
    percentageChange: number; // e.g., -25 means 25% improvement (fewer violations)
    currentWeekValue: number;
    previousWeekValue: number;
    averageValue: number;
}

export interface MemberTrendReport {
    memberId: string;
    memberName: string;
    profilePicture: string | null;
    weeklyData: WeeklyMetricData[];
    trends: {
        lateCheckins: TrendIndicator;
        superLateCheckins: TrendIndicator;
        insufficientHoursBoth: TrendIndicator;
        outsideOfficeWork: TrendIndicator;
        lessThan8hOffice: TrendIndicator;
        superLateWithOfficeButLowWork: TrendIndicator;
        superLateWithOfficeAndGoodWork: TrendIndicator;
    };
    overallStatus: 'improving' | 'declining' | 'stable';
}

export interface TrendAnalysisSummary {
    totalMembers: number;
    periodStart: Date;
    periodEnd: Date;
    totalWeeks: number;
    improvingMembers: number;
    decliningMembers: number;
    stableMembers: number;
}

export type TrendPeriod = 4 | 8 | 12;
