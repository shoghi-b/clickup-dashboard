/**
 * Test script to verify KPI calculations
 * Run with: npx tsx scripts/test-kpi-calculation.ts
 */

import { prisma } from '../lib/prisma';
import { kpiService } from '../lib/services/kpi-service';
import { insightsService } from '../lib/services/insights-service';
import { startOfWeek, endOfWeek, format } from 'date-fns';

async function testKPICalculation() {
  console.log('🧪 Testing KPI Calculation System\n');

  try {
    // 1. Check if we have data
    console.log('1️⃣ Checking for existing data...');
    const teamMemberCount = await prisma.teamMember.count();
    const timeEntryCount = await prisma.timeEntry.count();
    const attendanceCount = await prisma.attendanceRecord.count();

    console.log(`   ✓ Team Members: ${teamMemberCount}`);
    console.log(`   ✓ Time Entries: ${timeEntryCount}`);
    console.log(`   ✓ Attendance Records: ${attendanceCount}\n`);

    if (teamMemberCount === 0) {
      console.log('⚠️  No team members found. Please sync ClickUp data first.');
      return;
    }

    // 2. Calculate KPIs for current week
    console.log('2️⃣ Calculating KPIs for current week...');
    const periodStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const periodEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    console.log(`   Period: ${format(periodStart, 'MMM dd')} - ${format(periodEnd, 'MMM dd, yyyy')}`);

    await kpiService.calculateTeamKPISummary('WEEKLY', periodStart, periodEnd);
    console.log('   ✓ Team KPI calculated\n');

    // 3. Fetch and display team KPI
    console.log('3️⃣ Team KPI Summary:');
    const teamKPI = await prisma.teamKPISummary.findUnique({
      where: {
        periodType_periodStart: {
          periodType: 'WEEKLY',
          periodStart,
        },
      },
    });

    if (teamKPI) {
      console.log(`   📊 Accountability:`);
      console.log(`      - Attendance Compliance: ${teamKPI.attendanceComplianceRate.toFixed(1)}%`);
      console.log(`      - Timesheet Compliance: ${teamKPI.timesheetComplianceRate.toFixed(1)}%`);
      console.log(`      - Present Not Logged: ${teamKPI.presentNotLoggedCount} members`);
      console.log(`   📊 Capacity:`);
      console.log(`      - Avg Utilization: ${teamKPI.avgUtilization.toFixed(1)}%`);
      console.log(`      - Over Capacity: ${teamKPI.overCapacityCount} members`);
      console.log(`      - Under Capacity: ${teamKPI.underCapacityCount} members`);
      console.log(`   📊 Risk Signals:`);
      console.log(`      - Late Logging: ${teamKPI.lateLoggingCount} members`);
      console.log(`      - Zero Hour Days: ${teamKPI.zeroHourDaysCount} members`);
      console.log(`      - Weekend Logging: ${teamKPI.weekendLoggingCount} members\n`);
    }

    // 4. Fetch member KPIs
    console.log('4️⃣ Member KPI Summary:');
    const memberKPIs = await prisma.memberKPISummary.findMany({
      where: {
        periodType: 'WEEKLY',
        periodStart,
      },
      include: {
        teamMember: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        riskLevel: 'desc',
      },
    });

    const riskCounts = {
      CRITICAL: memberKPIs.filter(m => m.riskLevel === 'CRITICAL').length,
      HIGH: memberKPIs.filter(m => m.riskLevel === 'HIGH').length,
      MEDIUM: memberKPIs.filter(m => m.riskLevel === 'MEDIUM').length,
      LOW: memberKPIs.filter(m => m.riskLevel === 'LOW').length,
    };

    console.log(`   Total Members: ${memberKPIs.length}`);
    console.log(`   Risk Levels:`);
    console.log(`      - 🔴 Critical: ${riskCounts.CRITICAL}`);
    console.log(`      - 🟠 High: ${riskCounts.HIGH}`);
    console.log(`      - 🟡 Medium: ${riskCounts.MEDIUM}`);
    console.log(`      - 🟢 Low: ${riskCounts.LOW}\n`);

    // Show critical/high risk members
    const highRiskMembers = memberKPIs.filter(m => m.riskLevel === 'CRITICAL' || m.riskLevel === 'HIGH');
    if (highRiskMembers.length > 0) {
      console.log('   ⚠️  High Risk Members:');
      highRiskMembers.forEach(m => {
        console.log(`      - ${m.teamMember.username}: ${m.riskLevel} (${m.actionRequired || 'No action specified'})`);
      });
      console.log('');
    }

    // 5. Generate insights
    console.log('5️⃣ Generating insights...');
    await insightsService.generateInsights({
      periodType: 'WEEKLY',
      periodStart,
      periodEnd,
    });
    console.log('   ✓ Insights generated\n');

    // 6. Fetch and display insights
    console.log('6️⃣ Generated Insights:');
    const insights = await prisma.insight.findMany({
      where: {
        periodType: 'WEEKLY',
        periodStart,
      },
      orderBy: [
        { severity: 'desc' },
        { category: 'asc' },
      ],
    });

    if (insights.length === 0) {
      console.log('   ✅ No critical insights - team health looks good!\n');
    } else {
      insights.forEach((insight, idx) => {
        const icon = insight.severity === 'CRITICAL' ? '🔴' : insight.severity === 'WARNING' ? '🟡' : 'ℹ️';
        console.log(`   ${icon} [${insight.category}] ${insight.title}`);
        console.log(`      ${insight.description}`);
        if (insight.suggestedActions) {
          const actions = JSON.parse(insight.suggestedActions);
          console.log(`      Actions: ${actions[0]}`);
        }
        console.log('');
      });
    }

    console.log('✅ KPI calculation test completed successfully!');

  } catch (error) {
    console.error('❌ Error during KPI calculation test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testKPICalculation();

