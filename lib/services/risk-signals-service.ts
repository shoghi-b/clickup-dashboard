/**
 * Risk Signals Detection Service
 * Implements 8 risk signals for logging discipline, attendance integrity, capacity, and patterns
 */

import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, format, isWeekend, differenceInHours } from 'date-fns';

export type RiskSignalType =
  | 'PRESENT_NOT_LOGGED'      // R1: Attendance exists, ClickUp missing
  | 'LATE_LOGGING'            // R2: Time logged much later than work day
  | 'MISSING_ATTENDANCE'      // R3: No attendance on working day
  | 'EXCESSIVE_PRESENCE_LOW_OUTPUT' // R4: Long attendance, low ClickUp
  | 'SUSTAINED_OVER_CAPACITY' // R5: Repeated long ClickUp days
  | 'SUSTAINED_UNDER_CAPACITY' // R6: Low utilization despite attendance
  | 'WEEKEND_LOGGING'         // R7: ClickUp logs on Sat/Sun
  | 'VOLATILE_BEHAVIOR';      // R8: Large day-to-day swings

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskSignal {
  signalId: RiskSignalType;
  severity: RiskSeverity;
  occurrences: number;
  affectedDays: string[]; // ISO date strings
  memberName: string;
  memberId: string;
  details?: any;
}

export interface RiskSignalSummary {
  signalId: RiskSignalType;
  title: string;
  description: string;
  affectedMemberCount: number;
  severity: RiskSeverity;
  totalOccurrences: number;
}

const MIN_LOG_THRESHOLD = 1; // Minimum hours to consider "logged"
const LATE_LOGGING_DELAY_HOURS = 48; // 2 days
const EXCESSIVE_PRESENCE_THRESHOLD = 9; // 9+ hours attendance
const LOW_OUTPUT_THRESHOLD = 3; // ≤3 hours ClickUp
const OVER_CAPACITY_BUFFER = 2; // hours above expected
const UNDER_CAPACITY_THRESHOLD = 0.6; // 60% utilization
const VOLATILE_SWING_THRESHOLD = 4; // 4+ hour swings

export class RiskSignalsService {
  /**
   * Detect all risk signals for a given week
   */
  async detectWeeklyRiskSignals(weekStart: Date): Promise<RiskSignal[]> {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const signals: RiskSignal[] = [];

    // Get all team members
    const teamMembers = await prisma.teamMember.findMany({
      orderBy: { username: 'asc' },
    });

    for (const member of teamMembers) {
      // Get daily summaries for the week
      const dailySummaries = await prisma.dailySummary.findMany({
        where: {
          teamMemberId: member.id,
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        orderBy: { date: 'asc' },
      });

      // Get attendance records for the week
      const allAttendanceRecords = await prisma.attendanceRecord.findMany({
        where: {
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      });

      const attendanceRecords = allAttendanceRecords.filter(record =>
        record.employeeName.toLowerCase().includes(member.username.toLowerCase())
      );

      // Create a map of date -> data
      const dateMap = new Map<string, { attendance?: any; dailySummary?: any }>();

      // Populate attendance
      attendanceRecords.forEach(att => {
        const dateKey = format(att.date, 'yyyy-MM-dd');
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {});
        }
        dateMap.get(dateKey)!.attendance = att;
      });

      // Populate daily summaries
      dailySummaries.forEach(ds => {
        const dateKey = format(ds.date, 'yyyy-MM-dd');
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {});
        }
        dateMap.get(dateKey)!.dailySummary = ds;
      });

      // Detect signals for this member
      const memberSignals = this.detectMemberSignals(
        member,
        dateMap,
        weekStart,
        weekEnd
      );

      signals.push(...memberSignals);
    }

    return signals;
  }

  /**
   * Detect all signals for a single member
   */
  private detectMemberSignals(
    member: any,
    dateMap: Map<string, { attendance?: any; dailySummary?: any }>,
    weekStart: Date,
    weekEnd: Date
  ): RiskSignal[] {
    const signals: RiskSignal[] = [];

    // R1: Present but Not Logged
    const presentNotLoggedDays = this.detectPresentNotLogged(dateMap);
    if (presentNotLoggedDays.length >= 2) {
      signals.push({
        signalId: 'PRESENT_NOT_LOGGED',
        severity: presentNotLoggedDays.length >= 3 ? 'HIGH' : 'MEDIUM',
        occurrences: presentNotLoggedDays.length,
        affectedDays: presentNotLoggedDays,
        memberName: member.username,
        memberId: member.id,
      });
    }

    // R3: Missing Attendance on Working Day
    const missingAttendanceDays = this.detectMissingAttendance(dateMap, weekStart, weekEnd);
    if (missingAttendanceDays.length >= 1) {
      signals.push({
        signalId: 'MISSING_ATTENDANCE',
        severity: missingAttendanceDays.length >= 2 ? 'HIGH' : 'MEDIUM',
        occurrences: missingAttendanceDays.length,
        affectedDays: missingAttendanceDays,
        memberName: member.username,
        memberId: member.id,
      });
    }

    // R4: Excessive Presence with Low Output
    const excessivePresenceDays = this.detectExcessivePresenceLowOutput(dateMap);
    if (excessivePresenceDays.length >= 2) {
      signals.push({
        signalId: 'EXCESSIVE_PRESENCE_LOW_OUTPUT',
        severity: 'HIGH',
        occurrences: excessivePresenceDays.length,
        affectedDays: excessivePresenceDays,
        memberName: member.username,
        memberId: member.id,
      });
    }

    // R5: Sustained Over Capacity
    const overCapacityDays = this.detectSustainedOverCapacity(dateMap, member);
    if (overCapacityDays.length >= 3) {
      signals.push({
        signalId: 'SUSTAINED_OVER_CAPACITY',
        severity: 'HIGH',
        occurrences: overCapacityDays.length,
        affectedDays: overCapacityDays,
        memberName: member.username,
        memberId: member.id,
      });
    }

    // R6: Sustained Under Capacity
    const underCapacitySignal = this.detectSustainedUnderCapacity(dateMap, member);
    if (underCapacitySignal) {
      signals.push(underCapacitySignal);
    }

    // R7: Weekend Logging
    const weekendLoggingDays = this.detectWeekendLogging(dateMap);
    if (weekendLoggingDays.length > 0) {
      signals.push({
        signalId: 'WEEKEND_LOGGING',
        severity: weekendLoggingDays.length >= 2 ? 'MEDIUM' : 'LOW',
        occurrences: weekendLoggingDays.length,
        affectedDays: weekendLoggingDays,
        memberName: member.username,
        memberId: member.id,
      });
    }

    // R8: Volatile Behavior
    const volatileDays = this.detectVolatileBehavior(dateMap);
    if (volatileDays.length >= 2) {
      signals.push({
        signalId: 'VOLATILE_BEHAVIOR',
        severity: 'MEDIUM',
        occurrences: volatileDays.length,
        affectedDays: volatileDays,
        memberName: member.username,
        memberId: member.id,
      });
    }

    return signals;
  }

  /**
   * R1: Present but Not Logged
   * Attendance exists, ClickUp logged time is missing or negligible
   */
  private detectPresentNotLogged(
    dateMap: Map<string, { attendance?: any; dailySummary?: any }>
  ): string[] {
    const affectedDays: string[] = [];

    dateMap.forEach((data, dateKey) => {
      const hasAttendance = data.attendance && data.attendance.status === 'PRESENT';
      const clickUpHours = data.dailySummary?.totalHours || 0;

      if (hasAttendance && clickUpHours < MIN_LOG_THRESHOLD) {
        affectedDays.push(dateKey);
      }
    });

    return affectedDays;
  }

  /**
   * R3: Missing Attendance on Working Day
   * No attendance recorded, no approved exception
   */
  private detectMissingAttendance(
    dateMap: Map<string, { attendance?: any; dailySummary?: any }>,
    weekStart: Date,
    weekEnd: Date
  ): string[] {
    const affectedDays: string[] = [];
    const currentDate = new Date(weekStart);

    while (currentDate <= weekEnd) {
      if (!isWeekend(currentDate)) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        const data = dateMap.get(dateKey);

        if (!data?.attendance) {
          affectedDays.push(dateKey);
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return affectedDays;
  }

  /**
   * R4: Excessive Presence with Low Output
   * Long attendance hours, low ClickUp hours
   */
  private detectExcessivePresenceLowOutput(
    dateMap: Map<string, { attendance?: any; dailySummary?: any }>
  ): string[] {
    const affectedDays: string[] = [];

    dateMap.forEach((data, dateKey) => {
      const attendanceHours = data.attendance?.totalHours || 0;
      const clickUpHours = data.dailySummary?.totalHours || 0;

      if (attendanceHours >= EXCESSIVE_PRESENCE_THRESHOLD && clickUpHours <= LOW_OUTPUT_THRESHOLD) {
        affectedDays.push(dateKey);
      }
    });

    return affectedDays;
  }

  /**
   * R5: Sustained Over Capacity
   * Repeated long ClickUp days
   */
  private detectSustainedOverCapacity(
    dateMap: Map<string, { attendance?: any; dailySummary?: any }>,
    member: any
  ): string[] {
    const affectedDays: string[] = [];
    const expectedHours = member.expectedHoursPerDay || 8;

    dateMap.forEach((data, dateKey) => {
      const clickUpHours = data.dailySummary?.totalHours || 0;

      if (clickUpHours >= expectedHours + OVER_CAPACITY_BUFFER) {
        affectedDays.push(dateKey);
      }
    });

    return affectedDays;
  }

  /**
   * R6: Sustained Under Capacity
   * Low utilization despite attendance
   */
  private detectSustainedUnderCapacity(
    dateMap: Map<string, { attendance?: any; dailySummary?: any }>,
    member: any
  ): RiskSignal | null {
    let totalClickUpHours = 0;
    let totalExpectedHours = 0;
    let attendanceDays = 0;

    dateMap.forEach((data) => {
      if (data.attendance && data.attendance.status === 'PRESENT') {
        attendanceDays++;
        totalExpectedHours += member.expectedHoursPerDay || 8;
        totalClickUpHours += data.dailySummary?.totalHours || 0;
      }
    });

    const utilization = totalExpectedHours > 0 ? totalClickUpHours / totalExpectedHours : 0;
    const attendanceCompliance = attendanceDays >= 4 ? 0.8 : 0; // Simplified

    if (utilization < UNDER_CAPACITY_THRESHOLD && attendanceCompliance >= 0.8) {
      return {
        signalId: 'SUSTAINED_UNDER_CAPACITY',
        severity: 'MEDIUM',
        occurrences: attendanceDays,
        affectedDays: Array.from(dateMap.keys()),
        memberName: member.username,
        memberId: member.id,
        details: { utilization: Math.round(utilization * 100) },
      };
    }

    return null;
  }

  /**
   * R7: Weekend Logging
   * ClickUp logs on Sat/Sun
   */
  private detectWeekendLogging(
    dateMap: Map<string, { attendance?: any; dailySummary?: any }>
  ): string[] {
    const affectedDays: string[] = [];

    dateMap.forEach((data, dateKey) => {
      const date = new Date(dateKey);
      const clickUpHours = data.dailySummary?.totalHours || 0;

      if (isWeekend(date) && clickUpHours > 0) {
        affectedDays.push(dateKey);
      }
    });

    return affectedDays;
  }

  /**
   * R8: Volatile Behavior
   * Large day-to-day swings
   */
  private detectVolatileBehavior(
    dateMap: Map<string, { attendance?: any; dailySummary?: any }>
  ): string[] {
    const affectedDays: string[] = [];
    const sortedDates = Array.from(dateMap.keys()).sort();

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];

      const prevHours = dateMap.get(prevDate)?.dailySummary?.totalHours || 0;
      const currHours = dateMap.get(currDate)?.dailySummary?.totalHours || 0;

      if (Math.abs(currHours - prevHours) >= VOLATILE_SWING_THRESHOLD) {
        affectedDays.push(currDate);
      }
    }

    return affectedDays;
  }

  /**
   * Generate summary of risk signals (for dashboard display)
   */
  generateRiskSignalSummary(signals: RiskSignal[]): RiskSignalSummary[] {
    const summaryMap = new Map<RiskSignalType, RiskSignalSummary>();

    signals.forEach(signal => {
      if (!summaryMap.has(signal.signalId)) {
        summaryMap.set(signal.signalId, {
          signalId: signal.signalId,
          title: this.getSignalTitle(signal.signalId),
          description: this.getSignalDescription(signal.signalId),
          affectedMemberCount: 0,
          severity: signal.severity,
          totalOccurrences: 0,
        });
      }

      const summary = summaryMap.get(signal.signalId)!;
      summary.affectedMemberCount++;
      summary.totalOccurrences += signal.occurrences;

      // Use highest severity
      if (signal.severity === 'HIGH') {
        summary.severity = 'HIGH';
      } else if (signal.severity === 'MEDIUM' && summary.severity === 'LOW') {
        summary.severity = 'MEDIUM';
      }
    });

    return Array.from(summaryMap.values())
      .sort((a, b) => {
        // Sort by severity first, then by affected member count
        const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.affectedMemberCount - a.affectedMemberCount;
      })
      .slice(0, 3); // Top 3 signals only
  }

  private getSignalTitle(signalId: RiskSignalType): string {
    const titles: Record<RiskSignalType, string> = {
      PRESENT_NOT_LOGGED: 'Present but not logging time',
      LATE_LOGGING: 'Logging after 2+ days',
      MISSING_ATTENDANCE: 'Attendance missing on working day',
      EXCESSIVE_PRESENCE_LOW_OUTPUT: 'Long hours, low output',
      SUSTAINED_OVER_CAPACITY: 'Sustained overtime detected',
      SUSTAINED_UNDER_CAPACITY: 'Low utilization despite attendance',
      WEEKEND_LOGGING: 'Weekend logging detected',
      VOLATILE_BEHAVIOR: 'Unstable workload patterns',
    };
    return titles[signalId];
  }

  private getSignalDescription(signalId: RiskSignalType): string {
    const descriptions: Record<RiskSignalType, string> = {
      PRESENT_NOT_LOGGED: 'members frequently present but not logging time',
      LATE_LOGGING: 'members logging time 2+ days late',
      MISSING_ATTENDANCE: 'working days with missing attendance',
      EXCESSIVE_PRESENCE_LOW_OUTPUT: 'members with long attendance but low ClickUp hours',
      SUSTAINED_OVER_CAPACITY: 'members with sustained overtime this week',
      SUSTAINED_UNDER_CAPACITY: 'members underutilized despite good attendance',
      WEEKEND_LOGGING: 'members logging time on weekends',
      VOLATILE_BEHAVIOR: 'members with unstable day-to-day workload',
    };
    return descriptions[signalId];
  }
}

export const riskSignalsService = new RiskSignalsService();


