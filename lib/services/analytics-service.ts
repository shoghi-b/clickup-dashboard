import { prisma } from '@/lib/prisma';
import { getISOWeek, getYear } from 'date-fns';

type ComplianceStatus = 'FULLY_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT';
type UtilizationCategory = 'UNDER' | 'HEALTHY' | 'OVER';

const MINIMUM_DAILY_HOURS = 6;
const MINIMUM_ACTIVE_DAYS = 4;
const UNDER_UTILIZATION_THRESHOLD = 0.7; // 70%
const OVER_UTILIZATION_THRESHOLD = 1.0; // 100%
const EXCESSIVE_BACKFILL_THRESHOLD = 0.3; // 30% of entries

// Helper functions to work with UTC dates consistently
function startOfDayUTC(date: Date): Date {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  return utcDate;
}

function endOfDayUTC(date: Date): Date {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  return utcDate;
}

function isSameDayUTC(date1: Date, date2: Date): boolean {
  return date1.getUTCFullYear() === date2.getUTCFullYear() &&
         date1.getUTCMonth() === date2.getUTCMonth() &&
         date1.getUTCDate() === date2.getUTCDate();
}

// Get Monday of the week in UTC
function startOfWeekUTC(date: Date): Date {
  const dayOfWeek = date.getUTCDay();
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; // Monday is 1, Sunday is 0
  const monday = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + diff,
    0, 0, 0, 0
  ));
  return monday;
}

// Get Sunday of the week in UTC
function endOfWeekUTC(date: Date): Date {
  const monday = startOfWeekUTC(date);
  const sunday = new Date(Date.UTC(
    monday.getUTCFullYear(),
    monday.getUTCMonth(),
    monday.getUTCDate() + 6,
    23, 59, 59, 999
  ));
  return sunday;
}

export class AnalyticsService {
  /**
   * Clean up duplicate daily summaries that may have been created due to timezone issues
   */
  async cleanupDuplicateDailySummaries(): Promise<number> {
    const allSummaries = await prisma.dailySummary.findMany({
      orderBy: [
        { teamMemberId: 'asc' },
        { date: 'asc' },
        { createdAt: 'asc' }, // Keep the oldest one
      ],
    });

    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const summary of allSummaries) {
      // Normalize the date to UTC midnight for comparison
      const normalizedDate = startOfDayUTC(summary.date);
      const key = `${summary.teamMemberId}-${normalizedDate.toISOString()}`;

      if (seen.has(key)) {
        toDelete.push(summary.id);
      } else {
        seen.add(key);
      }
    }

    if (toDelete.length > 0) {
      await prisma.dailySummary.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    return toDelete.length;
  }

  /**
   * Clean up duplicate weekly summaries that may have been created due to timezone issues
   */
  async cleanupDuplicateWeeklySummaries(): Promise<number> {
    const allSummaries = await prisma.weeklySummary.findMany({
      orderBy: [
        { teamMemberId: 'asc' },
        { year: 'asc' },
        { weekNumber: 'asc' },
        { createdAt: 'asc' }, // Keep the oldest one
      ],
    });

    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const summary of allSummaries) {
      const key = `${summary.teamMemberId}-${summary.year}-${summary.weekNumber}`;

      if (seen.has(key)) {
        toDelete.push(summary.id);
      } else {
        seen.add(key);
      }
    }

    if (toDelete.length > 0) {
      await prisma.weeklySummary.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    return toDelete.length;
  }

  async calculateDailySummary(
    teamMemberId: string,
    date: Date
  ): Promise<void> {
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
    });

    if (!teamMember) {
      throw new Error(`Team member not found: ${teamMemberId}`);
    }

    const dayStart = startOfDayUTC(date);
    const dayEnd = endOfDayUTC(date);

    // Get all time entries for this day
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        teamMemberId,
        startDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    // Calculate metrics
    const totalMilliseconds = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const totalHours = totalMilliseconds / (1000 * 60 * 60);
    const entryCount = timeEntries.length;
    const sameDayEntries = timeEntries.filter(entry => !entry.isBackfilled).length;
    const backfilledEntries = timeEntries.filter(entry => entry.isBackfilled).length;

    // Determine compliance
    const meetsMinimum = totalHours >= MINIMUM_DAILY_HOURS;
    const isSameDayLogging = sameDayEntries > 0 && backfilledEntries === 0;
    
    let complianceStatus: ComplianceStatus;
    if (meetsMinimum && isSameDayLogging) {
      complianceStatus = 'FULLY_COMPLIANT';
    } else if (meetsMinimum || sameDayEntries > 0) {
      complianceStatus = 'PARTIALLY_COMPLIANT';
    } else {
      complianceStatus = 'NON_COMPLIANT';
    }

    // Calculate utilization
    const utilizationPercent = (totalHours / teamMember.expectedHoursPerDay) * 100;

    // Upsert daily summary
    await prisma.dailySummary.upsert({
      where: {
        teamMemberId_date: {
          teamMemberId,
          date: dayStart,
        },
      },
      update: {
        totalHours,
        entryCount,
        sameDayEntries,
        backfilledEntries,
        complianceStatus,
        meetsMinimum,
        isSameDay: isSameDayLogging,
        utilizationPercent,
      },
      create: {
        teamMemberId,
        date: dayStart,
        totalHours,
        entryCount,
        sameDayEntries,
        backfilledEntries,
        complianceStatus,
        meetsMinimum,
        isSameDay: isSameDayLogging,
        utilizationPercent,
      },
    });
  }

  async calculateWeeklySummary(
    teamMemberId: string,
    weekStartDate: Date
  ): Promise<void> {
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
    });

    if (!teamMember) {
      throw new Error(`Team member not found: ${teamMemberId}`);
    }

    // Use UTC-aware week boundaries
    const weekStart = startOfWeekUTC(weekStartDate); // Monday in UTC
    const weekEnd = endOfWeekUTC(weekStartDate); // Sunday in UTC
    const year = getYear(weekStart);
    const weekNumber = getISOWeek(weekStart);

    // Get all time entries for this week
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        teamMemberId,
        startDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });

    // Calculate metrics
    const totalMilliseconds = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const totalHours = totalMilliseconds / (1000 * 60 * 60);
    const entryCount = timeEntries.length;
    const backfilledCount = timeEntries.filter(entry => entry.isBackfilled).length;

    // Calculate active days (unique days with entries)
    const uniqueDays = new Set(
      timeEntries.map(entry => startOfDayUTC(entry.startDate).getTime())
    );
    const activeDays = uniqueDays.size;

    // Determine compliance
    const meetsActiveThreshold = activeDays >= MINIMUM_ACTIVE_DAYS;
    const backfillRatio = entryCount > 0 ? backfilledCount / entryCount : 0;
    const limitedBackfilling = backfillRatio <= EXCESSIVE_BACKFILL_THRESHOLD;

    let complianceStatus: ComplianceStatus;
    if (meetsActiveThreshold && limitedBackfilling) {
      complianceStatus = 'FULLY_COMPLIANT';
    } else if (meetsActiveThreshold || limitedBackfilling) {
      complianceStatus = 'PARTIALLY_COMPLIANT';
    } else {
      complianceStatus = 'NON_COMPLIANT';
    }

    // Calculate utilization
    const utilizationPercent = (totalHours / teamMember.expectedHoursPerWeek) * 100;
    const utilizationRatio = utilizationPercent / 100;

    let utilizationCategory: UtilizationCategory;
    if (utilizationRatio < UNDER_UTILIZATION_THRESHOLD) {
      utilizationCategory = 'UNDER';
    } else if (utilizationRatio <= OVER_UTILIZATION_THRESHOLD) {
      utilizationCategory = 'HEALTHY';
    } else {
      utilizationCategory = 'OVER';
    }

    // Risk signals
    const hasUnderLogging = utilizationRatio < UNDER_UTILIZATION_THRESHOLD;
    const hasOverwork = utilizationRatio > OVER_UTILIZATION_THRESHOLD;
    const hasExcessiveBackfill = backfillRatio > EXCESSIVE_BACKFILL_THRESHOLD;

    // Upsert weekly summary
    await prisma.weeklySummary.upsert({
      where: {
        teamMemberId_year_weekNumber: {
          teamMemberId,
          year,
          weekNumber,
        },
      },
      update: {
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        totalHours,
        activeDays,
        entryCount,
        backfilledCount,
        complianceStatus,
        meetsActiveThreshold,
        limitedBackfilling,
        utilizationPercent,
        utilizationCategory,
        hasUnderLogging,
        hasOverwork,
        hasExcessiveBackfill,
      },
      create: {
        teamMemberId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        year,
        weekNumber,
        totalHours,
        activeDays,
        entryCount,
        backfilledCount,
        complianceStatus,
        meetsActiveThreshold,
        limitedBackfilling,
        utilizationPercent,
        utilizationCategory,
        hasUnderLogging,
        hasOverwork,
        hasExcessiveBackfill,
      },
    });
  }

  async recalculateAllSummaries(startDate: Date, endDate: Date): Promise<void> {
    // First, clean up any existing duplicates
    console.log('Cleaning up duplicate summaries...');
    const dailyDuplicates = await this.cleanupDuplicateDailySummaries();
    const weeklyDuplicates = await this.cleanupDuplicateWeeklySummaries();

    if (dailyDuplicates > 0 || weeklyDuplicates > 0) {
      console.log(`Removed ${dailyDuplicates} duplicate daily summaries and ${weeklyDuplicates} duplicate weekly summaries`);
    }

    const teamMembers = await prisma.teamMember.findMany();

    for (const member of teamMembers) {
      // Calculate daily summaries - use UTC to avoid timezone issues
      let currentDate = startOfDayUTC(startDate);
      const end = startOfDayUTC(endDate);

      while (currentDate <= end) {
        await this.calculateDailySummary(member.id, currentDate);
        // Add 1 day in UTC
        currentDate = new Date(Date.UTC(
          currentDate.getUTCFullYear(),
          currentDate.getUTCMonth(),
          currentDate.getUTCDate() + 1,
          0, 0, 0, 0
        ));
      }

      // Calculate weekly summaries - use UTC-aware week boundaries
      const weekStart = startOfWeekUTC(startDate);
      const weekEnd = startOfWeekUTC(endDate);

      let currentWeek = new Date(weekStart);
      while (currentWeek <= weekEnd) {
        await this.calculateWeeklySummary(member.id, currentWeek);
        // Add 7 days in UTC
        currentWeek = new Date(Date.UTC(
          currentWeek.getUTCFullYear(),
          currentWeek.getUTCMonth(),
          currentWeek.getUTCDate() + 7,
          0, 0, 0, 0
        ));
      }
    }
  }
}

