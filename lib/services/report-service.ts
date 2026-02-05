/**
 * Report Service
 * Generates compliance reports for team members based on attendance and ClickUp data
 */

import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, eachDayOfInterval, isWeekend, format, parseISO } from 'date-fns';
import type { MemberComplianceReport, ComplianceMetrics, DateDetail } from '@/lib/types/report';

// Constants for compliance thresholds
export const LATE_CHECKIN_TIME = '10:30';
export const SUPER_LATE_CHECKIN_TIME = '10:45';
export const MINIMUM_HOURS = 8;

/**
 * Parse time string (HH:mm) to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
    if (!timeStr) return null;

    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    return hours * 60 + minutes;
}

/**
 * Check if check-in time is late (after threshold)
 */
function isLateCheckin(checkInTime: string | null, thresholdTime: string): boolean {
    const checkInMinutes = parseTimeToMinutes(checkInTime);
    const thresholdMinutes = parseTimeToMinutes(thresholdTime);

    if (checkInMinutes === null || thresholdMinutes === null) return false;

    return checkInMinutes > thresholdMinutes;
}

/**
 * Generate compliance report for a single team member
 */
export async function generateMemberComplianceReport(
    memberId: string,
    startDate: Date,
    endDate: Date
): Promise<MemberComplianceReport | null> {
    // Fetch team member
    const teamMember = await prisma.teamMember.findUnique({
        where: { id: memberId },
    });

    if (!teamMember) {
        return null;
    }

    // Get all work days in the period (excluding weekends)
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const workDays = allDays.filter(day => !isWeekend(day));
    const totalWorkDays = workDays.length;

    // Fetch attendance records for this member
    const allAttendanceRecords = await prisma.attendanceRecord.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    // Filter attendance records by name matching (flexible matching)
    const attendanceRecords = allAttendanceRecords.filter(record => {
        const attendanceName = record.employeeName.toLowerCase().trim();
        const memberName = teamMember.username.toLowerCase().trim();
        return memberName.includes(attendanceName) || attendanceName.includes(memberName);
    });

    // Fetch daily summaries (ClickUp data)
    const dailySummaries = await prisma.dailySummary.findMany({
        where: {
            teamMemberId: memberId,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    // Create maps for quick lookup
    const attendanceMap = new Map(
        attendanceRecords.map(record => [format(new Date(record.date), 'yyyy-MM-dd'), record])
    );
    const clickupMap = new Map(
        dailySummaries.map(summary => [format(new Date(summary.date), 'yyyy-MM-dd'), summary])
    );

    // Initialize metrics
    const metrics: ComplianceMetrics = {
        lateCheckins: 0,
        superLateCheckins: 0,
        insufficientHoursBoth: 0,
        outsideOfficeWork: 0,
        noDataDays: 0,
        superLateWithOfficeButLowWork: 0,
        superLateWithOfficeAndGoodWork: 0,
        lessThan8hOffice: 0,
        lateCheckinDates: [],
        superLateCheckinDates: [],
        insufficientHoursDates: [],
        outsideWorkDates: [],
        noDataDates: [],
        superLateWithOfficeButLowWorkDates: [],
        superLateWithOfficeAndGoodWorkDates: [],
        lessThan8hOfficeDates: [],
    };

    // Analyze each work day
    for (const day of workDays) {
        const dateKey = format(day, 'yyyy-MM-dd');
        const attendance = attendanceMap.get(dateKey);
        const clickup = clickupMap.get(dateKey);

        const attendanceHours = attendance?.totalHours || 0;
        const clickupHours = clickup?.totalHours || 0;
        const isSuperLate = attendance?.firstIn && isLateCheckin(attendance.firstIn, SUPER_LATE_CHECKIN_TIME);

        // 1. Check for late check-ins
        if (attendance?.firstIn) {
            if (isLateCheckin(attendance.firstIn, SUPER_LATE_CHECKIN_TIME)) {
                metrics.superLateCheckins++;
                metrics.superLateCheckinDates.push({
                    date: dateKey,
                    value: attendance.firstIn,
                    attendanceHours,
                    clickupHours,
                });
            } else if (isLateCheckin(attendance.firstIn, LATE_CHECKIN_TIME)) {
                metrics.lateCheckins++;
                metrics.lateCheckinDates.push({
                    date: dateKey,
                    value: attendance.firstIn,
                    attendanceHours,
                    clickupHours,
                });
            }
        }

        // 2. Check for insufficient hours (both)
        if (attendanceHours < MINIMUM_HOURS && clickupHours < MINIMUM_HOURS) {
            // Only count if there's some data (not a complete no-data day)
            if (attendanceHours > 0 || clickupHours > 0) {
                metrics.insufficientHoursBoth++;
                metrics.insufficientHoursDates.push({
                    date: dateKey,
                    value: `A: ${attendanceHours.toFixed(1)}h, C: ${clickupHours.toFixed(1)}h`,
                    attendanceHours,
                    clickupHours,
                });
            }
        }

        // 3. Check for outside office work
        if (attendanceHours < MINIMUM_HOURS && clickupHours >= MINIMUM_HOURS) {
            metrics.outsideOfficeWork++;
            metrics.outsideWorkDates.push({
                date: dateKey,
                value: `A: ${attendanceHours.toFixed(1)}h, C: ${clickupHours.toFixed(1)}h`,
                attendanceHours,
                clickupHours,
            });
        }

        // 4. Check for no data days
        if (attendanceHours === 0 && clickupHours === 0) {
            metrics.noDataDays++;
            metrics.noDataDates.push(dateKey);
        }

        // 5. Super late + 8h+ office + <8h work
        if (isSuperLate && attendanceHours >= MINIMUM_HOURS && clickupHours < MINIMUM_HOURS) {
            metrics.superLateWithOfficeButLowWork++;
            metrics.superLateWithOfficeButLowWorkDates.push({
                date: dateKey,
                value: `${attendance.firstIn} | A: ${attendanceHours.toFixed(1)}h, C: ${clickupHours.toFixed(1)}h`,
                attendanceHours,
                clickupHours,
            });
        }

        // 6. Super late + 8h+ office + 8h+ work
        if (isSuperLate && attendanceHours >= MINIMUM_HOURS && clickupHours >= MINIMUM_HOURS) {
            metrics.superLateWithOfficeAndGoodWork++;
            metrics.superLateWithOfficeAndGoodWorkDates.push({
                date: dateKey,
                value: `${attendance.firstIn} | A: ${attendanceHours.toFixed(1)}h, C: ${clickupHours.toFixed(1)}h`,
                attendanceHours,
                clickupHours,
            });
        }

        // 7. Less than 8 hours in office (regardless of ClickUp hours)
        if (attendanceHours > 0 && attendanceHours < MINIMUM_HOURS) {
            metrics.lessThan8hOffice++;
            metrics.lessThan8hOfficeDates.push({
                date: dateKey,
                value: `Office: ${attendanceHours.toFixed(1)}h | ClickUp: ${clickupHours.toFixed(1)}h`,
                attendanceHours,
                clickupHours,
            });
        }
    }

    return {
        memberId: teamMember.id,
        memberName: teamMember.username,
        profilePicture: teamMember.profilePicture,
        periodStart: startDate,
        periodEnd: endDate,
        totalWorkDays,
        metrics,
    };
}

/**
 * Generate compliance reports for multiple team members
 */
export async function generateTeamComplianceReport(
    memberIds: string[],
    startDate: Date,
    endDate: Date
): Promise<MemberComplianceReport[]> {
    const reports: MemberComplianceReport[] = [];

    for (const memberId of memberIds) {
        const report = await generateMemberComplianceReport(memberId, startDate, endDate);
        if (report) {
            reports.push(report);
        }
    }

    return reports;
}

export const reportService = {
    generateMemberComplianceReport,
    generateTeamComplianceReport,
};
