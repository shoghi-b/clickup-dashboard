import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, isWeekend, parseISO, format } from 'date-fns';

export type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type UtilizationStatus = 'UNDER' | 'HEALTHY' | 'OVER';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Thresholds
const UNDER_UTILIZATION_THRESHOLD = 0.6; // 60%
const OVER_UTILIZATION_THRESHOLD = 0.85; // 85%
const MINIMUM_DAILY_HOURS = 6;
const LATE_LOGGING_THRESHOLD_DAYS = 2;
const BURNOUT_RISK_THRESHOLD = 0.9; // 90% utilization

export class KPIService {
  /**
   * Calculate Team KPI Summary for a given period
   */
  async calculateTeamKPISummary(
    periodType: PeriodType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    const teamMembers = await prisma.teamMember.findMany();
    
    let attendanceCompliantCount = 0;
    let timesheetCompliantCount = 0;
    let presentNotLoggedCount = 0;
    let totalUtilization = 0;
    let overCapacityCount = 0;
    let underCapacityCount = 0;
    let lateLoggingCount = 0;
    let zeroHourDaysCount = 0;
    let weekendLoggingCount = 0;
    let activeMembersCount = 0;

    // Calculate individual member KPIs first
    for (const member of teamMembers) {
      await this.calculateMemberKPISummary(member.id, periodType, periodStart, periodEnd);
      
      // Fetch the calculated member KPI
      const memberKPI = await prisma.memberKPISummary.findUnique({
        where: {
          teamMemberId_periodType_periodStart: {
            teamMemberId: member.id,
            periodType,
            periodStart,
          },
        },
      });

      if (memberKPI) {
        if (memberKPI.attendanceCompliance) attendanceCompliantCount++;
        if (memberKPI.timesheetCompliance) timesheetCompliantCount++;
        if (memberKPI.presentNotLogged) presentNotLoggedCount++;
        
        totalUtilization += memberKPI.utilization;
        
        if (memberKPI.utilizationStatus === 'OVER') overCapacityCount++;
        if (memberKPI.utilizationStatus === 'UNDER') underCapacityCount++;
        
        if (memberKPI.hasLateLoggingRisk) lateLoggingCount++;
        if (memberKPI.hasZeroHourRisk) zeroHourDaysCount++;
        if (memberKPI.hasWeekendRisk) weekendLoggingCount++;
        
        if (memberKPI.totalHoursLogged > 0) activeMembersCount++;
      }
    }

    const totalMembers = teamMembers.length;
    const avgUtilization = activeMembersCount > 0 ? totalUtilization / activeMembersCount : 0;
    const attendanceComplianceRate = totalMembers > 0 ? (attendanceCompliantCount / totalMembers) * 100 : 0;
    const timesheetComplianceRate = totalMembers > 0 ? (timesheetCompliantCount / totalMembers) * 100 : 0;

    // Upsert team KPI summary
    await prisma.teamKPISummary.upsert({
      where: {
        periodType_periodStart: {
          periodType,
          periodStart,
        },
      },
      update: {
        periodEnd,
        attendanceComplianceRate,
        timesheetComplianceRate,
        presentNotLoggedCount,
        avgUtilization,
        overCapacityCount,
        underCapacityCount,
        lateLoggingCount,
        zeroHourDaysCount,
        weekendLoggingCount,
        totalMembers,
        activeMembersCount,
      },
      create: {
        periodType,
        periodStart,
        periodEnd,
        attendanceComplianceRate,
        timesheetComplianceRate,
        presentNotLoggedCount,
        avgUtilization,
        overCapacityCount,
        underCapacityCount,
        lateLoggingCount,
        zeroHourDaysCount,
        weekendLoggingCount,
        totalMembers,
        activeMembersCount,
      },
    });
  }

  /**
   * Calculate Member KPI Summary for a given period
   */
  async calculateMemberKPISummary(
    teamMemberId: string,
    periodType: PeriodType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
    });

    if (!teamMember) {
      throw new Error(`Team member not found: ${teamMemberId}`);
    }

    // Calculate expected work days (excluding weekends)
    const expectedWorkDays = this.calculateWorkDays(periodStart, periodEnd);
    const expectedHours = periodType === 'DAILY' 
      ? teamMember.expectedHoursPerDay
      : periodType === 'WEEKLY'
      ? teamMember.expectedHoursPerWeek
      : teamMember.expectedHoursPerDay * expectedWorkDays;

    // Fetch attendance records
    // Note: SQLite doesn't support case-insensitive mode, so we fetch all and filter
    const allAttendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: 'PRESENT',
      },
    });

    const attendanceRecords = allAttendanceRecords.filter(record =>
      record.employeeName.toLowerCase().includes(teamMember.username.toLowerCase())
    );

    const attendanceDays = attendanceRecords.length;

    // Fetch daily summaries (ClickUp time entries)
    const dailySummaries = await prisma.dailySummary.findMany({
      where: {
        teamMemberId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    // Fetch time entries for risk analysis
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        teamMemberId,
        startDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Calculate metrics
    const totalHoursLogged = dailySummaries.reduce((sum, ds) => sum + ds.totalHours, 0);
    const daysWithLogging = dailySummaries.filter(ds => ds.totalHours > 0).length;
    const daysWithMinimumHours = dailySummaries.filter(ds => ds.totalHours >= MINIMUM_DAILY_HOURS).length;

    // Accountability KPIs
    const attendanceCompliance = attendanceDays >= expectedWorkDays * 0.8; // 80% threshold
    const timesheetCompliance = daysWithMinimumHours >= expectedWorkDays * 0.8; // 80% threshold
    const presentNotLogged = attendanceDays > 0 && daysWithLogging === 0;

    // Capacity KPIs
    const utilization = expectedHours > 0 ? (totalHoursLogged / expectedHours) * 100 : 0;
    const utilizationStatus: UtilizationStatus =
      utilization < UNDER_UTILIZATION_THRESHOLD * 100 ? 'UNDER' :
      utilization > OVER_UTILIZATION_THRESHOLD * 100 ? 'OVER' : 'HEALTHY';

    // Risk Signals
    const lateLoggingDays = this.calculateLateLoggingDays(timeEntries);
    const zeroHourDays = dailySummaries.filter(ds => ds.totalHours === 0).length;
    const weekendLoggingDays = this.calculateWeekendLoggingDays(timeEntries);
    const consecutiveZeroDays = this.calculateConsecutiveZeroDays(dailySummaries);

    // Risk Flags
    const hasLateLoggingRisk = lateLoggingDays > expectedWorkDays * 0.3; // 30% threshold
    const hasZeroHourRisk = zeroHourDays > 2;
    const hasWeekendRisk = weekendLoggingDays > 2;
    const hasBurnoutRisk = utilization > BURNOUT_RISK_THRESHOLD * 100 && weekendLoggingDays > 0;

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel({
      hasLateLoggingRisk,
      hasZeroHourRisk,
      hasWeekendRisk,
      hasBurnoutRisk,
      presentNotLogged,
      utilizationStatus,
    });

    // Suggested action
    const actionRequired = this.generateActionRequired({
      riskLevel,
      hasLateLoggingRisk,
      hasZeroHourRisk,
      hasWeekendRisk,
      hasBurnoutRisk,
      presentNotLogged,
      utilizationStatus,
      timesheetCompliance,
      attendanceCompliance,
    });

    // Upsert member KPI summary
    await prisma.memberKPISummary.upsert({
      where: {
        teamMemberId_periodType_periodStart: {
          teamMemberId,
          periodType,
          periodStart,
        },
      },
      update: {
        periodEnd,
        attendanceCompliance,
        timesheetCompliance,
        presentNotLogged,
        attendanceDays,
        expectedWorkDays,
        utilization,
        utilizationStatus,
        totalHoursLogged,
        expectedHours,
        lateLoggingDays,
        zeroHourDays,
        weekendLoggingDays,
        consecutiveZeroDays,
        hasLateLoggingRisk,
        hasZeroHourRisk,
        hasWeekendRisk,
        hasBurnoutRisk,
        riskLevel,
        actionRequired,
      },
      create: {
        teamMemberId,
        periodType,
        periodStart,
        periodEnd,
        attendanceCompliance,
        timesheetCompliance,
        presentNotLogged,
        attendanceDays,
        expectedWorkDays,
        utilization,
        utilizationStatus,
        totalHoursLogged,
        expectedHours,
        lateLoggingDays,
        zeroHourDays,
        weekendLoggingDays,
        consecutiveZeroDays,
        hasLateLoggingRisk,
        hasZeroHourRisk,
        hasWeekendRisk,
        hasBurnoutRisk,
        riskLevel,
        actionRequired,
      },
    });
  }

  /**
   * Helper: Calculate work days (excluding weekends)
   */
  private calculateWorkDays(startDate: Date, endDate: Date): number {
    let workDays = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (!isWeekend(currentDate)) {
        workDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workDays;
  }

  /**
   * Helper: Calculate late logging days (logged after 2+ days)
   */
  private calculateLateLoggingDays(timeEntries: any[]): number {
    let lateCount = 0;
    const processedDays = new Set<string>();

    for (const entry of timeEntries) {
      const workDay = format(new Date(entry.startDate), 'yyyy-MM-dd');
      const loggedDay = format(new Date(entry.loggedAt), 'yyyy-MM-dd');

      if (!processedDays.has(workDay)) {
        const daysDiff = differenceInDays(new Date(loggedDay), new Date(workDay));
        if (daysDiff >= LATE_LOGGING_THRESHOLD_DAYS) {
          lateCount++;
        }
        processedDays.add(workDay);
      }
    }

    return lateCount;
  }

  /**
   * Helper: Calculate weekend logging days
   */
  private calculateWeekendLoggingDays(timeEntries: any[]): number {
    const weekendDays = new Set<string>();

    for (const entry of timeEntries) {
      const entryDate = new Date(entry.startDate);
      if (isWeekend(entryDate)) {
        weekendDays.add(format(entryDate, 'yyyy-MM-dd'));
      }
    }

    return weekendDays.size;
  }

  /**
   * Helper: Calculate consecutive zero hour days
   */
  private calculateConsecutiveZeroDays(dailySummaries: any[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    const sortedSummaries = dailySummaries.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const summary of sortedSummaries) {
      if (summary.totalHours === 0) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  /**
   * Helper: Calculate risk level
   */
  private calculateRiskLevel(params: {
    hasLateLoggingRisk: boolean;
    hasZeroHourRisk: boolean;
    hasWeekendRisk: boolean;
    hasBurnoutRisk: boolean;
    presentNotLogged: boolean;
    utilizationStatus: UtilizationStatus;
  }): RiskLevel {
    const {
      hasLateLoggingRisk,
      hasZeroHourRisk,
      hasWeekendRisk,
      hasBurnoutRisk,
      presentNotLogged,
      utilizationStatus,
    } = params;

    // Critical: Burnout risk or present but not logging
    if (hasBurnoutRisk || presentNotLogged) {
      return 'CRITICAL';
    }

    // High: Multiple risk factors
    const riskCount = [hasLateLoggingRisk, hasZeroHourRisk, hasWeekendRisk].filter(Boolean).length;
    if (riskCount >= 2) {
      return 'HIGH';
    }

    // Medium: Single risk factor or capacity issues
    if (riskCount === 1 || utilizationStatus === 'OVER' || utilizationStatus === 'UNDER') {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Helper: Generate action required
   */
  private generateActionRequired(params: {
    riskLevel: RiskLevel;
    hasLateLoggingRisk: boolean;
    hasZeroHourRisk: boolean;
    hasWeekendRisk: boolean;
    hasBurnoutRisk: boolean;
    presentNotLogged: boolean;
    utilizationStatus: UtilizationStatus;
    timesheetCompliance: boolean;
    attendanceCompliance: boolean;
  }): string | null {
    const {
      riskLevel,
      hasLateLoggingRisk,
      hasZeroHourRisk,
      hasWeekendRisk,
      hasBurnoutRisk,
      presentNotLogged,
      utilizationStatus,
      timesheetCompliance,
      attendanceCompliance,
    } = params;

    if (riskLevel === 'LOW') {
      return null;
    }

    const actions: string[] = [];

    if (presentNotLogged) {
      actions.push('IMMEDIATE: Follow up on missing time logs despite attendance');
    }

    if (hasBurnoutRisk) {
      actions.push('URGENT: Assess workload and prevent burnout');
    }

    if (!timesheetCompliance) {
      actions.push('Send timesheet logging reminders');
    }

    if (!attendanceCompliance) {
      actions.push('Investigate attendance issues');
    }

    if (hasLateLoggingRisk) {
      actions.push('Enforce same-day logging discipline');
    }

    if (hasZeroHourRisk) {
      actions.push('Verify work status on zero-hour days');
    }

    if (hasWeekendRisk) {
      actions.push('Review weekend work patterns');
    }

    if (utilizationStatus === 'OVER') {
      actions.push('Reallocate workload or add support');
    }

    if (utilizationStatus === 'UNDER') {
      actions.push('Review task allocation and capacity planning');
    }

    return actions.join(' | ');
  }
}

export const kpiService = new KPIService();

