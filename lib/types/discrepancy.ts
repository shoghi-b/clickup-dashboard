// Discrepancy Types for Attendance vs ClickUp Logging

export type DiscrepancyRule =
    | "LOG_AFTER_EXIT"       // Logged during OUT periods (lunch, breaks)
    | "NO_ATTENDANCE"        // Logged during work hours without attendance
    | "OUTSIDE_HOURS"        // Logged outside official work hours (informational)
    | "ZERO_PRESENCE";       // Near-zero presence with significant logging

export type DiscrepancySeverity = "low" | "medium" | "high";
export type DiscrepancyStatus = "open" | "resolved";

export interface InOutPeriod {
    in: string;   // HH:mm format
    out: string;  // HH:mm format
}

export interface Discrepancy {
    id: string;
    userId: string;
    userName?: string;
    date: string;
    teamMember?: {
        username: string;
        email: string | null;
        profilePicture: string | null;
    };
    rule: DiscrepancyRule;
    severity: DiscrepancySeverity;
    minutesInvolved: number;
    status: DiscrepancyStatus;
    resolvedContext?: {
        reason: string;
        note?: string;
        resolvedAt: string;
        resolvedBy?: string;
    };
    metadata?: string | {
        logTime?: string;
        loggedMinutes?: number;
        attendanceTimeIn?: string;
        attendanceTimeOut?: string;
        inOutPeriods?: InOutPeriod[];
        outPeriodDuring?: { start: string; end: string };
        [key: string]: any;
    };
    createdAt: string;
    updatedAt: string;
}

export interface DiscrepancySummary {
    rule: DiscrepancyRule;
    count: number;
    severity: DiscrepancySeverity;
    title: string;
    description: string;
    affectedMemberIds: string[];
}

export interface DiscrepancyStats {
    totalDiscrepancies: number;
    openDiscrepancies: number;
    resolvedDiscrepancies: number;
    byRule: Record<DiscrepancyRule, number>;
    bySeverity: Record<DiscrepancySeverity, number>;
}
