/**
 * Discrepancy Detection Service
 * Implements detection rules for attendance vs ClickUp logging discrepancies
 */

import { prisma } from '@/lib/prisma';
import type {
    Discrepancy,
    DiscrepancyRule,
    DiscrepancySeverity,
    InOutPeriod,
    DiscrepancySummary
} from '@/lib/types/discrepancy';
import { startOfDay, endOfDay, format } from 'date-fns';

// Working rules constants
export const WORKDAY_START = "10:00";
export const WORKDAY_END = "20:00";
export const MIN_PRESENCE_THRESHOLD_MIN = 30;  // Minimum minutes to be considered "present"
export const MIN_LOG_THRESHOLD_MIN = 60;       // Minimum logged minutes to verify work

/**
 * Parse time string (HH:mm) to minutes since midnight
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
    if (!timeStr || timeStr === '--:--' || timeStr === '00:00') {
        return null;
    }

    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    return hours * 60 + minutes;
}

/**
 * Convert minutes to HH:mm format
 */
export function minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if a log time falls during any OUT period
 */
export function isLoggedDuringOutPeriod(
    logTime: string,
    inOutPeriods: InOutPeriod[]
): { isDuringOut: boolean; outPeriod?: { start: string; end: string } } {
    const logMinutes = parseTimeToMinutes(logTime);
    if (logMinutes === null) {
        return { isDuringOut: false };
    }

    // Build OUT periods from IN/OUT pairs
    // An OUT period is the gap between one OUT and the next IN
    for (let i = 0; i < inOutPeriods.length - 1; i++) {
        const currentPeriod = inOutPeriods[i];
        const nextPeriod = inOutPeriods[i + 1];

        const outTime = parseTimeToMinutes(currentPeriod.out);
        const nextInTime = parseTimeToMinutes(nextPeriod.in);

        if (outTime !== null && nextInTime !== null) {
            // Check if log falls in the OUT period
            if (logMinutes > outTime && logMinutes < nextInTime) {
                return {
                    isDuringOut: true,
                    outPeriod: {
                        start: currentPeriod.out,
                        end: nextPeriod.in
                    }
                };
            }
        }
    }

    return { isDuringOut: false };
}

/**
 * Calculate severity based on minutes involved
 */
export function calculateSeverity(
    rule: DiscrepancyRule,
    minutes: number
): DiscrepancySeverity {
    switch (rule) {
        case 'LOG_AFTER_EXIT':
            return minutes <= 30 ? 'medium' : 'high';
        case 'NO_ATTENDANCE':
            return 'medium';
        case 'OUTSIDE_HOURS':
            return 'low';  // Informational only
        case 'ZERO_PRESENCE':
            return 'high';
        default:
            return 'medium';
    }
}

/**
 * Compute all discrepancies for a user on a specific date
 */
export async function computeDiscrepancies(
    userId: string,
    date: Date
): Promise<Partial<Discrepancy>[]> {
    const discrepancies: Partial<Discrepancy>[] = [];

    // Get attendance record for this date
    const teamMember = await prisma.teamMember.findUnique({
        where: { id: userId }
    });

    if (!teamMember) return discrepancies;

    const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: {
            employeeName: teamMember.username,
            date: {
                gte: startOfDay(date),
                lte: endOfDay(date)
            }
        }
    });

    const attendanceRecord = attendanceRecords[0]; // Take first match

    // Get ClickUp time entries for this date
    const timeEntries = await prisma.timeEntry.findMany({
        where: {
            teamMemberId: userId,
            startDate: {
                gte: startOfDay(date),
                lte: endOfDay(date)
            }
        }
    });

    // Parse IN/OUT periods from attendance
    let inOutPeriods: InOutPeriod[] = [];
    if (attendanceRecord?.inOutPeriods) {
        try {
            inOutPeriods = JSON.parse(attendanceRecord.inOutPeriods);
        } catch (e) {
            console.error('Failed to parse inOutPeriods:', e);
        }
    }

    // Calculate total logged minutes
    const totalLoggedMinutes = timeEntries.reduce((sum, entry) => {
        return sum + (entry.duration / 1000 / 60); // Convert ms to minutes
    }, 0);

    // Rule D1: Logged during OUT periods (lunch, breaks)
    if (inOutPeriods.length > 1) {
        for (const entry of timeEntries) {
            const logTime = format(new Date(entry.loggedAt), 'HH:mm');
            const { isDuringOut, outPeriod } = isLoggedDuringOutPeriod(logTime, inOutPeriods);

            if (isDuringOut && outPeriod) {
                const loggedMinutes = Math.round(entry.duration / 1000 / 60);
                const severity = calculateSeverity('LOG_AFTER_EXIT', loggedMinutes);

                discrepancies.push({
                    userId,
                    date: format(date, 'yyyy-MM-dd'),
                    rule: 'LOG_AFTER_EXIT',
                    severity,
                    minutesInvolved: loggedMinutes,
                    status: 'open',
                    metadata: JSON.stringify({
                        logTime,
                        taskName: entry.taskName,
                        taskId: entry.taskId,
                        clickupId: entry.clickupId,
                        outPeriodDuring: outPeriod,
                        inOutPeriods
                    })
                });
            }
        }
    }

    // Rule D2: Logged during office hours without attendance
    if (!attendanceRecord || attendanceRecord.status === 'ABSENT') {
        const workdayStartMin = parseTimeToMinutes(WORKDAY_START);
        const workdayEndMin = parseTimeToMinutes(WORKDAY_END);

        const logsWithinWorkHours = timeEntries.filter(entry => {
            const logMinutes = parseTimeToMinutes(format(new Date(entry.loggedAt), 'HH:mm'));
            return logMinutes !== null &&
                logMinutes >= workdayStartMin! &&
                logMinutes <= workdayEndMin!;
        });

        if (logsWithinWorkHours.length > 0) {
            const severity = calculateSeverity('NO_ATTENDANCE', totalLoggedMinutes);

            discrepancies.push({
                userId,
                date: format(date, 'yyyy-MM-dd'),
                rule: 'NO_ATTENDANCE',
                severity,
                minutesInvolved: Math.round(totalLoggedMinutes),
                status: 'open',
                metadata: JSON.stringify({
                    logCount: logsWithinWorkHours.length,
                    totalLoggedMinutes: Math.round(totalLoggedMinutes)
                })
            });
        }
    }

    // Rule D3: Logged outside office hours (informational)
    const workdayStartMin = parseTimeToMinutes(WORKDAY_START);
    const workdayEndMin = parseTimeToMinutes(WORKDAY_END);

    const outsideHoursLogs = timeEntries.filter(entry => {
        const logMinutes = parseTimeToMinutes(format(new Date(entry.loggedAt), 'HH:mm'));
        return logMinutes !== null &&
            (logMinutes < workdayStartMin! || logMinutes > workdayEndMin!);
    });

    if (outsideHoursLogs.length > 0) {
        const minutes = outsideHoursLogs.reduce((sum, entry) =>
            sum + (entry.duration / 1000 / 60), 0);
        const severity = calculateSeverity('OUTSIDE_HOURS', minutes);

        discrepancies.push({
            userId,
            date: format(date, 'yyyy-MM-dd'),
            rule: 'OUTSIDE_HOURS',
            severity,
            minutesInvolved: Math.round(minutes),
            status: 'open',
            metadata: JSON.stringify({
                logCount: outsideHoursLogs.length,
                outsideHoursMinutes: Math.round(minutes)
            })
        });
    }

    // Rule D4: Near-zero presence with significant logging
    if (attendanceRecord) {
        const presenceMinutes = attendanceRecord.totalHours * 60;

        if (presenceMinutes < MIN_PRESENCE_THRESHOLD_MIN &&
            totalLoggedMinutes > MIN_LOG_THRESHOLD_MIN) {
            const severity = calculateSeverity('ZERO_PRESENCE', totalLoggedMinutes);

            discrepancies.push({
                userId,
                date: format(date, 'yyyy-MM-dd'),
                rule: 'ZERO_PRESENCE',
                severity,
                minutesInvolved: Math.round(totalLoggedMinutes),
                status: 'open',
                metadata: JSON.stringify({
                    presenceMinutes: Math.round(presenceMinutes),
                    loggedMinutes: Math.round(totalLoggedMinutes),
                    attendanceStatus: attendanceRecord.status
                })
            });
        }
    }

    return discrepancies;
}

/**
 * Save or update a discrepancy record
 */
export async function saveDiscrepancy(discrepancy: Partial<Discrepancy>) {
    if (!discrepancy.userId || !discrepancy.date || !discrepancy.rule) {
        throw new Error('Missing required fields for discrepancy');
    }

    const date = new Date(discrepancy.date);

    const metadataToSave = typeof discrepancy.metadata === 'object'
        ? JSON.stringify(discrepancy.metadata)
        : discrepancy.metadata;

    return await prisma.discrepancy.upsert({
        where: {
            teamMemberId_date_rule: {
                teamMemberId: discrepancy.userId,
                date,
                rule: discrepancy.rule
            }
        },
        update: {
            severity: discrepancy.severity!,
            minutesInvolved: discrepancy.minutesInvolved!,
            metadata: metadataToSave,
            updatedAt: new Date()
        },
        create: {
            teamMemberId: discrepancy.userId,
            date,
            rule: discrepancy.rule,
            severity: discrepancy.severity!,
            minutesInvolved: discrepancy.minutesInvolved!,
            status: 'open',
            metadata: metadataToSave
        }
    });
}

/**
 * Resolve a discrepancy
 */
export async function resolveDiscrepancy(
    discrepancyId: string,
    reason: string,
    note?: string,
    resolvedBy?: string
) {
    return await prisma.discrepancy.update({
        where: { id: discrepancyId },
        data: {
            status: 'resolved',
            resolvedReason: reason,
            resolvedNote: note,
            resolvedAt: new Date(),
            resolvedBy
        }
    });
}

/**
 * Get discrepancies for a specific member
 */
export async function getDiscrepanciesForMember(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    status?: 'open' | 'resolved'
) {
    return await prisma.discrepancy.findMany({
        where: {
            teamMemberId: userId,
            ...(startDate && endDate ? {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            } : {}),
            ...(status ? { status } : {})
        },
        include: {
            teamMember: {
                select: {
                    id: true,
                    username: true,
                    email: true
                }
            }
        },
        orderBy: { date: 'desc' }
    });
}

/**
 * Get discrepancies for a week
 */
export async function getDiscrepanciesForWeek(
    weekStart: Date,
    weekEnd: Date,
    status?: 'open' | 'resolved'
) {
    return await prisma.discrepancy.findMany({
        where: {
            date: {
                gte: weekStart,
                lte: weekEnd
            },
            ...(status ? { status } : {})
        },
        include: {
            teamMember: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    profilePicture: true
                }
            }
        },
        orderBy: [
            { severity: 'desc' },
            { date: 'desc' }
        ]
    });
}

/**
 * Generate summary of discrepancies grouped by rule
 */
export function generateDiscrepancySummary(
    discrepancies: any[]
): DiscrepancySummary[] {
    const groupedByRule = discrepancies.reduce((acc, d) => {
        if (!acc[d.rule]) {
            acc[d.rule] = [];
        }
        acc[d.rule].push(d);
        return acc;
    }, {} as Record<string, any[]>);

    const summaries: DiscrepancySummary[] = [];

    for (const [rule, untypedItems] of Object.entries(groupedByRule)) {
        const items = untypedItems as any[];
        const uniqueMembers = new Set(items.map(d => d.teamMemberId));
        const maxSeverity = items.reduce((max, d) => {
            const severityOrder: Record<DiscrepancySeverity, number> = { low: 1, medium: 2, high: 3 };
            return severityOrder[d.severity as DiscrepancySeverity] > severityOrder[max as DiscrepancySeverity] ? d.severity : max;
        }, 'low' as DiscrepancySeverity);

        summaries.push({
            rule: rule as DiscrepancyRule,
            count: items.length,
            severity: maxSeverity,
            title: getRuleTitle(rule as DiscrepancyRule),
            description: getRuleDescription(rule as DiscrepancyRule),
            affectedMemberIds: Array.from(uniqueMembers)
        });
    }

    return summaries;
}

function getRuleTitle(rule: DiscrepancyRule): string {
    switch (rule) {
        case 'LOG_AFTER_EXIT':
            return 'Logged During OUT Periods';
        case 'NO_ATTENDANCE':
            return 'Logged Without Attendance';
        case 'OUTSIDE_HOURS':
            return 'After-Hours Logging';
        case 'ZERO_PRESENCE':
            return 'High Logging with Minimal Presence';
        default:
            return 'Unknown';
    }
}

function getRuleDescription(rule: DiscrepancyRule): string {
    switch (rule) {
        case 'LOG_AFTER_EXIT':
            return 'members logged time during lunch/break periods';
        case 'NO_ATTENDANCE':
            return 'members logged time without attendance record';
        case 'OUTSIDE_HOURS':
            return 'members logged time outside work hours';
        case 'ZERO_PRESENCE':
            return 'members with high ClickUp logs but minimal office presence';
        default:
            return 'unknown discrepancy type';
    }
}

export const discrepancyService = {
    computeDiscrepancies,
    saveDiscrepancy,
    resolveDiscrepancy,
    getDiscrepanciesForMember,
    getDiscrepanciesForWeek,
    generateDiscrepancySummary
};
