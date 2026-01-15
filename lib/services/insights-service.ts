import { prisma } from '@/lib/prisma';
import { PeriodType } from './kpi-service';

export type InsightCategory = 'ACCOUNTABILITY' | 'CAPACITY' | 'RISK' | 'GENERAL';
export type InsightSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

interface GenerateInsightsParams {
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
}

export class InsightsService {
  /**
   * Generate insights for team and members
   */
  async generateInsights(params: GenerateInsightsParams): Promise<void> {
    const { periodType, periodStart, periodEnd } = params;

    // Fetch team KPI summary
    const teamKPI = await prisma.teamKPISummary.findUnique({
      where: {
        periodType_periodStart: {
          periodType,
          periodStart,
        },
      },
    });

    if (!teamKPI) {
      console.warn('No team KPI found for period');
      return;
    }

    // Generate team-level insights
    await this.generateTeamInsights(teamKPI, periodType, periodStart, periodEnd);

    // Fetch member KPIs
    const memberKPIs = await prisma.memberKPISummary.findMany({
      where: {
        periodType,
        periodStart,
      },
      include: {
        teamMember: true,
      },
    });

    // Generate member-level insights
    for (const memberKPI of memberKPIs) {
      await this.generateMemberInsights(memberKPI, periodType, periodStart, periodEnd);
    }
  }

  /**
   * Generate team-level insights
   */
  private async generateTeamInsights(
    teamKPI: any,
    periodType: PeriodType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    const insights: Array<{
      category: InsightCategory;
      severity: InsightSeverity;
      title: string;
      description: string;
      metrics: any;
      suggestedActions: string[];
    }> = [];

    // Accountability Insights
    if (teamKPI.attendanceComplianceRate < 80) {
      insights.push({
        category: 'ACCOUNTABILITY',
        severity: 'CRITICAL',
        title: 'Low Attendance Compliance',
        description: `Only ${teamKPI.attendanceComplianceRate.toFixed(1)}% of the team is showing up consistently. This is a fundamental attendance problem that undermines all other metrics.`,
        metrics: {
          attendanceComplianceRate: teamKPI.attendanceComplianceRate,
          totalMembers: teamKPI.totalMembers,
        },
        suggestedActions: [
          'Investigate leaves and absenteeism patterns',
          'Validate attendance source for gaps',
          'Address remote work exceptions',
          'Review team availability and scheduling',
        ],
      });
    }

    if (teamKPI.timesheetComplianceRate < 80) {
      insights.push({
        category: 'ACCOUNTABILITY',
        severity: teamKPI.timesheetComplianceRate < 60 ? 'CRITICAL' : 'WARNING',
        title: 'Poor Timesheet Discipline',
        description: `${teamKPI.timesheetComplianceRate.toFixed(1)}% timesheet compliance means your utilization data cannot be trusted. This is a discipline issue, not a performance issue.`,
        metrics: {
          timesheetComplianceRate: teamKPI.timesheetComplianceRate,
          totalMembers: teamKPI.totalMembers,
        },
        suggestedActions: [
          'Send daily logging reminders',
          'Enforce logging discipline through 1-on-1s',
          'Block incentives/reviews for non-compliant members',
          'Implement automated reminder system',
        ],
      });
    }

    if (teamKPI.presentNotLoggedCount > 0) {
      insights.push({
        category: 'ACCOUNTABILITY',
        severity: 'CRITICAL',
        title: 'Present But Not Logging Time',
        description: `${teamKPI.presentNotLoggedCount} team member(s) are showing up but not logging time. This is the most critical reconciliation signal - your utilization data is lying.`,
        metrics: {
          presentNotLoggedCount: teamKPI.presentNotLoggedCount,
        },
        suggestedActions: [
          'IMMEDIATE: Follow up with each member',
          'Identify if this is forgetfulness or intentional',
          'Educate on policy and consequences',
          'Set up daily check-ins until resolved',
        ],
      });
    }

    // Capacity Insights
    if (teamKPI.avgUtilization < 60) {
      insights.push({
        category: 'CAPACITY',
        severity: 'WARNING',
        title: 'Team Under-Utilized',
        description: `Average utilization of ${teamKPI.avgUtilization.toFixed(1)}% suggests the team is underutilized or logging is poor. This could indicate planning issues or data quality problems.`,
        metrics: {
          avgUtilization: teamKPI.avgUtilization,
          underCapacityCount: teamKPI.underCapacityCount,
        },
        suggestedActions: [
          'Review project allocation and staffing',
          'Verify logging compliance first',
          'Assess if team has sufficient work',
          'Consider rebalancing workload',
        ],
      });
    }

    if (teamKPI.avgUtilization > 85) {
      insights.push({
        category: 'CAPACITY',
        severity: 'WARNING',
        title: 'Team Over-Capacity',
        description: `Average utilization of ${teamKPI.avgUtilization.toFixed(1)}% indicates the team is stretched thin. Risk of burnout and quality issues.`,
        metrics: {
          avgUtilization: teamKPI.avgUtilization,
          overCapacityCount: teamKPI.overCapacityCount,
        },
        suggestedActions: [
          'Add support or redistribute work',
          'Review project timelines and scope',
          'Monitor for burnout signals',
          'Consider hiring or contractor support',
        ],
      });
    }

    // Risk Insights
    if (teamKPI.lateLoggingCount > teamKPI.totalMembers * 0.3) {
      insights.push({
        category: 'RISK',
        severity: 'WARNING',
        title: 'Widespread Late Logging',
        description: `${teamKPI.lateLoggingCount} members are consistently logging time 2+ days late. This indicates backfilling and unreliable data.`,
        metrics: {
          lateLoggingCount: teamKPI.lateLoggingCount,
          totalMembers: teamKPI.totalMembers,
        },
        suggestedActions: [
          'Enforce same-day logging policy',
          'Send automated daily reminders',
          'Review with team leads',
          'Implement logging accountability measures',
        ],
      });
    }

    if (teamKPI.weekendLoggingCount > 0) {
      insights.push({
        category: 'RISK',
        severity: teamKPI.weekendLoggingCount > teamKPI.totalMembers * 0.2 ? 'WARNING' : 'INFO',
        title: 'Weekend Work Detected',
        description: `${teamKPI.weekendLoggingCount} members are logging time on weekends. This could indicate burnout risk or time-padding.`,
        metrics: {
          weekendLoggingCount: teamKPI.weekendLoggingCount,
        },
        suggestedActions: [
          'Investigate context (legitimate vs padding)',
          'Look for patterns, not one-offs',
          'Assess workload balance',
          'Ensure proper work-life boundaries',
        ],
      });
    }

    // General Health Insight
    const healthScore = this.calculateTeamHealthScore(teamKPI);
    if (healthScore >= 80) {
      insights.push({
        category: 'GENERAL',
        severity: 'INFO',
        title: 'Team Health: Strong',
        description: `Overall team health score of ${healthScore}%. Good attendance, timesheet discipline, and healthy utilization. Continue monitoring for early warning signs.`,
        metrics: {
          healthScore,
          attendanceComplianceRate: teamKPI.attendanceComplianceRate,
          timesheetComplianceRate: teamKPI.timesheetComplianceRate,
          avgUtilization: teamKPI.avgUtilization,
        },
        suggestedActions: [
          'Maintain current practices',
          'Continue regular monitoring',
          'Share best practices across team',
        ],
      });
    } else if (healthScore < 60) {
      insights.push({
        category: 'GENERAL',
        severity: 'CRITICAL',
        title: 'Team Health: Critical',
        description: `Overall team health score of ${healthScore}%. Multiple accountability and capacity issues detected. Immediate intervention required.`,
        metrics: {
          healthScore,
          attendanceComplianceRate: teamKPI.attendanceComplianceRate,
          timesheetComplianceRate: teamKPI.timesheetComplianceRate,
          avgUtilization: teamKPI.avgUtilization,
        },
        suggestedActions: [
          'Schedule team review meeting',
          'Address top 3 issues immediately',
          'Implement daily check-ins',
          'Escalate to leadership',
        ],
      });
    }

    // Save insights
    for (const insight of insights) {
      await prisma.insight.create({
        data: {
          scope: 'TEAM',
          scopeId: null,
          periodType,
          periodStart,
          periodEnd,
          category: insight.category,
          severity: insight.severity,
          title: insight.title,
          description: insight.description,
          metrics: JSON.stringify(insight.metrics),
          suggestedActions: JSON.stringify(insight.suggestedActions),
        },
      });
    }
  }

  /**
   * Generate member-level insights
   */
  private async generateMemberInsights(
    memberKPI: any,
    periodType: PeriodType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    // Only generate insights for members with issues
    if (memberKPI.riskLevel === 'LOW') {
      return;
    }

    const insights: Array<{
      category: InsightCategory;
      severity: InsightSeverity;
      title: string;
      description: string;
      metrics: any;
      suggestedActions: string[];
    }> = [];

    const memberName = memberKPI.teamMember.username;

    // Critical: Present but not logging
    if (memberKPI.presentNotLogged) {
      insights.push({
        category: 'ACCOUNTABILITY',
        severity: 'CRITICAL',
        title: `${memberName}: Present But Not Logging`,
        description: `${memberName} has been marked present for ${memberKPI.attendanceDays} days but has not logged any time. This is a critical data integrity issue.`,
        metrics: {
          attendanceDays: memberKPI.attendanceDays,
          totalHoursLogged: memberKPI.totalHoursLogged,
        },
        suggestedActions: [
          'Immediate 1-on-1 follow-up',
          'Verify attendance data accuracy',
          'Educate on logging requirements',
          'Set daily logging reminders',
        ],
      });
    }

    // Burnout risk
    if (memberKPI.hasBurnoutRisk) {
      insights.push({
        category: 'RISK',
        severity: 'CRITICAL',
        title: `${memberName}: Burnout Risk Detected`,
        description: `${memberName} is logging ${memberKPI.utilization.toFixed(1)}% utilization with ${memberKPI.weekendLoggingDays} weekend days. High risk of burnout.`,
        metrics: {
          utilization: memberKPI.utilization,
          weekendLoggingDays: memberKPI.weekendLoggingDays,
          totalHoursLogged: memberKPI.totalHoursLogged,
        },
        suggestedActions: [
          'URGENT: Assess workload immediately',
          'Redistribute work or add support',
          'Schedule wellness check-in',
          'Monitor closely for next 2 weeks',
        ],
      });
    }

    // Save member insights
    for (const insight of insights) {
      await prisma.insight.create({
        data: {
          scope: 'MEMBER',
          scopeId: memberKPI.teamMemberId,
          periodType,
          periodStart,
          periodEnd,
          category: insight.category,
          severity: insight.severity,
          title: insight.title,
          description: insight.description,
          metrics: JSON.stringify(insight.metrics),
          suggestedActions: JSON.stringify(insight.suggestedActions),
        },
      });
    }
  }

  /**
   * Calculate team health score (0-100)
   */
  private calculateTeamHealthScore(teamKPI: any): number {
    let score = 100;

    // Deduct for accountability issues
    score -= (100 - teamKPI.attendanceComplianceRate) * 0.3;
    score -= (100 - teamKPI.timesheetComplianceRate) * 0.3;
    score -= teamKPI.presentNotLoggedCount * 10;

    // Deduct for capacity issues
    if (teamKPI.avgUtilization < 60) {
      score -= (60 - teamKPI.avgUtilization) * 0.5;
    } else if (teamKPI.avgUtilization > 85) {
      score -= (teamKPI.avgUtilization - 85) * 0.5;
    }

    // Deduct for risk signals
    score -= teamKPI.lateLoggingCount * 2;
    score -= teamKPI.weekendLoggingCount * 1;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

export const insightsService = new InsightsService();

