/**
 * Test script for Weekly KPI Dashboard
 * Run with: npx tsx scripts/test-weekly-kpi.ts
 */

import { prisma } from '../lib/prisma';
import { riskSignalsService } from '../lib/services/risk-signals-service';
import { startOfWeek } from 'date-fns';

async function testWeeklyKPI() {
  console.log('🧪 Testing Weekly KPI Dashboard...\n');

  try {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    console.log('📊 Detecting risk signals for the week...');
    const riskSignals = await riskSignalsService.detectWeeklyRiskSignals(weekStart);

    console.log(`\n✅ Found ${riskSignals.length} risk signals\n`);

    // Group by member
    const memberSignals = new Map<string, typeof riskSignals>();
    riskSignals.forEach((signal) => {
      if (!memberSignals.has(signal.memberName)) {
        memberSignals.set(signal.memberName, []);
      }
      memberSignals.get(signal.memberName)!.push(signal);
    });

    console.log('📋 Risk Signals by Member:\n');
    memberSignals.forEach((signals, memberName) => {
      console.log(`👤 ${memberName}:`);
      signals.forEach((signal) => {
        console.log(`   ⚠️  ${signal.signalId} (${signal.severity})`);
        console.log(`       Occurrences: ${signal.occurrences}`);
        console.log(`       Affected Days: ${signal.affectedDays.join(', ')}`);
      });
      console.log('');
    });

    // Generate summary
    console.log('📊 Generating Risk Signal Summary...\n');
    const summary = riskSignalsService.generateRiskSignalSummary(riskSignals);

    console.log('🎯 Top Risk Signals (for dashboard display):\n');
    summary.forEach((signal, index) => {
      console.log(`${index + 1}. ${signal.title} (${signal.severity})`);
      console.log(`   ⚠️ ${signal.affectedMemberCount} ${signal.description}`);
      console.log(`   Total Occurrences: ${signal.totalOccurrences}\n`);
    });

    // Test KPI calculation
    console.log('📈 Calculating Weekly KPIs...\n');

    const teamMembers = await prisma.teamMember.findMany({
      orderBy: { username: 'asc' },
    });

    const dailySummaries = await prisma.dailySummary.findMany({
      where: {
        date: {
          gte: weekStart,
        },
      },
    });

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: weekStart,
        },
      },
    });

    console.log(`✅ Team Members: ${teamMembers.length}`);
    console.log(`✅ Daily Summaries: ${dailySummaries.length}`);
    console.log(`✅ Attendance Records: ${attendanceRecords.length}`);

    console.log('\n✨ Weekly KPI Dashboard test completed successfully!\n');
  } catch (error) {
    console.error('❌ Error testing weekly KPI:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testWeeklyKPI();

