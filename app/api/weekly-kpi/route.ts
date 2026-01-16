import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { riskSignalsService } from '@/lib/services/risk-signals-service';
import { startOfWeek, endOfWeek, format, eachDayOfInterval, isWeekend } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const memberIdsParam = searchParams.get('memberIds');

    const targetDate = date ? new Date(date) : new Date();
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    // Parse member IDs filter
    const memberIds = memberIdsParam ? memberIdsParam.split(',').filter(Boolean) : [];

    // Get team members (filtered if memberIds provided)
    const teamMembers = await prisma.teamMember.findMany({
      where: memberIds.length > 0 ? { id: { in: memberIds } } : undefined,
      orderBy: { username: 'asc' },
    });

    // Get all daily summaries for the week (filtered by members)
    const dailySummaries = await prisma.dailySummary.findMany({
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        ...(memberIds.length > 0 ? { teamMemberId: { in: memberIds } } : {}),
      },
    });

    // Get all attendance records for the week (filtered by members)
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        ...(memberIds.length > 0
          ? {
              employeeName: {
                in: teamMembers.map((m: { username: string }) => m.username),
              },
            }
          : {}),
      },
    });

    // Calculate KPIs
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
      (day) => !isWeekend(day)
    );

    let totalAttendanceCompliance = 0;
    let totalTimesheetCompliance = 0;
    let presentNotLoggedCount = 0;
    let totalUtilization = 0;
    let overCapacityCount = 0;
    let underCapacityCount = 0;

    const memberData = teamMembers.map((member) => {
      const memberDailySummaries = dailySummaries.filter((ds) => ds.teamMemberId === member.id);
      const memberAttendance = attendanceRecords.filter((ar: { employeeName: string }) =>
        ar.employeeName.toLowerCase().includes(member.username.toLowerCase())
      );

      // Calculate daily data
      const dailyData = weekDays.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dailySummary = memberDailySummaries.find(
          (ds) => format(ds.date, 'yyyy-MM-dd') === dateKey
        );
        const attendance = memberAttendance.find(
          (ar) => format(ar.date, 'yyyy-MM-dd') === dateKey
        );

        const clickupHours = dailySummary?.totalHours || 0;
        const attendanceHours = attendance?.totalHours || 0;
        const isPresent = attendance?.status === 'PRESENT';

        let status: 'present' | 'absent' | 'partial' | 'missing' = 'missing';
        if (isPresent && clickupHours >= 4) {
          status = 'present';
        } else if (isPresent && clickupHours > 0) {
          status = 'partial';
        } else if (isPresent) {
          status = 'absent';
        }

        return {
          date: dateKey,
          attendance: attendanceHours,
          clickup: clickupHours,
          status,
          isPresent,
        };
      });

      // Calculate member KPIs
      const presentDays = dailyData.filter((d) => d.isPresent).length;
      const loggedDays = dailyData.filter((d) => d.clickup >= 4).length;
      const totalClickUpHours = dailyData.reduce((sum, d) => sum + d.clickup, 0);
      const expectedHours = (member.expectedHoursPerDay || 8) * weekDays.length;
      const utilization = expectedHours > 0 ? (totalClickUpHours / expectedHours) * 100 : 0;

      const attendanceCompliance = presentDays >= 4;
      const timesheetCompliance = loggedDays >= 4;
      const hasPresentNotLogged = dailyData.some((d) => d.isPresent && d.clickup < 1);

      if (attendanceCompliance) totalAttendanceCompliance++;
      if (timesheetCompliance) totalTimesheetCompliance++;
      if (hasPresentNotLogged) presentNotLoggedCount++;

      if (utilization > 85) overCapacityCount++;
      else if (utilization < 60) underCapacityCount++;

      totalUtilization += utilization;

      return {
        id: member.id,
        name: member.username,
        status: attendanceCompliance && timesheetCompliance ? 'Healthy' : 'At Risk',
        days: dailyData,
        total: totalClickUpHours,
        utilization,
        attendanceCompliance,
        timesheetCompliance,
      };
    });

    const avgUtilization = teamMembers.length > 0 ? totalUtilization / teamMembers.length : 0;
    const attendanceComplianceRate =
      teamMembers.length > 0 ? (totalAttendanceCompliance / teamMembers.length) * 100 : 0;
    const timesheetComplianceRate =
      teamMembers.length > 0 ? (totalTimesheetCompliance / teamMembers.length) * 100 : 0;

    // Detect risk signals
    const riskSignals = await riskSignalsService.detectWeeklyRiskSignals(weekStart);
    const riskSignalSummary = riskSignalsService.generateRiskSignalSummary(riskSignals);

    // Generate insights
    let insights = null;
    if (riskSignalSummary.length > 0) {
      const topSignal = riskSignalSummary[0];
      insights = {
        title: `This week: ${topSignal.affectedMemberCount} ${topSignal.description}`,
        description: `${topSignal.title} detected. ${
          topSignal.severity === 'HIGH' ? 'Immediate' : 'Prompt'
        } attention required. Review affected members for 1:1 sessions.`,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: weekStart,
          end: weekEnd,
        },
        kpi: {
          attendanceCompliance: Math.round(attendanceComplianceRate),
          timesheetCompliance: Math.round(timesheetComplianceRate),
          presentNotLogged: presentNotLoggedCount,
          avgUtilization: Math.round(avgUtilization),
          overCapacity: overCapacityCount,
          underCapacity: underCapacityCount,
        },
        riskSignals: riskSignalSummary,
        insights,
        members: memberData,
      },
    });
  } catch (error) {
    console.error('Weekly KPI error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch weekly KPI data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

