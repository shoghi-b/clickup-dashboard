// Test discrepancy detection with the new attendance data
import { prisma } from './lib/prisma';
import { discrepancyService } from './lib/services/discrepancy-service';
import { format } from 'date-fns';

async function testWithNewData() {
    console.log('🔎 Testing discrepancy detection with new attendance data...\n');

    // Find a record with multiple IN/OUT periods
    const recordWithPeriods = await prisma.attendanceRecord.findFirst({
        where: {
            inOutPeriods: { not: null },
            NOT: { inOutPeriods: '[]' }
        },
        orderBy: { date: 'desc' }
    });

    if (!recordWithPeriods) {
        console.log('❌ No records with IN/OUT periods found');
        return;
    }

    console.log(`✅ Found record: ${recordWithPeriods.employeeName} on ${format(recordWithPeriods.date, 'yyyy-MM-dd')}`);
    console.log(`   IN/OUT Periods: ${recordWithPeriods.inOutPeriods}\n`);

    // Parse periods to show breaks
    const periods = JSON.parse(recordWithPeriods.inOutPeriods || '[]');
    console.log(`📊 Detected ${periods.length} IN/OUT periods:`);
    periods.forEach((p: any, i: number) => {
        console.log(`   ${i + 1}. IN ${p.in} → OUT ${p.out}`);
    });

    // Calculate OUT periods (breaks)
    const outPeriods: Array<{ start: string; end: string }> = [];
    for (let i = 0; i < periods.length - 1; i++) {
        outPeriods.push({
            start: periods[i].out,
            end: periods[i + 1].in
        });
    }

    if (outPeriods.length > 0) {
        console.log(`\n🕐 OUT periods (breaks) detected:`);
        outPeriods.forEach((op, i) => {
            console.log(`   ${i + 1}. OUT ${op.start} → IN ${op.end}`);
        });
    }

    // Find team member
    const member = await prisma.teamMember.findFirst({
        where: {
            username: recordWithPeriods.employeeName
        }
    });

    if (!member) {
        console.log(`\n⚠️  Team member "${recordWithPeriods.employeeName}" not found`);
        return;
    }

    console.log(`\n👤 Testing with: ${member.username} (ID: ${member.id})`);

    // Check if there are time entries for this day
    const timeEntries = await prisma.timeEntry.findMany({
        where: {
            teamMemberId: member.id,
            startDate: {
                gte: new Date(recordWithPeriods.date.getFullYear(), recordWithPeriods.date.getMonth(), recordWithPeriods.date.getDate()),
                lt: new Date(recordWithPeriods.date.getFullYear(), recordWithPeriods.date.getMonth(), recordWithPeriods.date.getDate() + 1)
            }
        }
    });

    console.log(`\n⏱️  Found ${timeEntries.length} ClickUp time entries for this day:`);
    if (timeEntries.length > 0) {
        timeEntries.forEach((entry, i) => {
            const logTime = format(entry.loggedAt, 'HH:mm');
            console.log(`   ${i + 1}. ${logTime} - ${entry.taskName} (${Math.round(entry.duration / 1000 / 60)}m)`);
        });
    }

    // Run detection
    console.log(`\n\n🔍 Running discrepancy detection...`);
    const discrepancies = await discrepancyService.computeDiscrepancies(
        member.id,
        recordWithPeriods.date
    );

    console.log(`\n✅ Detection completed!`);
    console.log(`Found ${discrepancies.length} discrepancies\n`);

    if (discrepancies.length > 0) {
        console.log('='.repeat(60));
        discrepancies.forEach((d, idx) => {
            console.log(`\n${idx + 1}. ${d.rule}`);
            console.log(`   Severity: ${d.severity?.toUpperCase() || 'UNKNOWN'}`);
            console.log(`   Minutes involved: ${d.minutesInvolved}`);
            console.log(`   Status: ${d.status}`);
            if (d.metadata) {
                console.log(`   Metadata: ${d.metadata}`);
            }
        });
        console.log('\n' + '='.repeat(60));

        // Save discrepancies
        console.log('\n💾 Saving discrepancies to database...');
        for (const d of discrepancies) {
            const saved = await discrepancyService.saveDiscrepancy(d);
            console.log(`   ✅ Saved: ${saved.rule} (ID: ${saved.id})`);
        }
    } else {
        console.log('ℹ️  No discrepancies detected - all logging is compliant!');
    }

    // Show final summary
    const totalDiscrepancies = await prisma.discrepancy.count();
    console.log(`\n📊 Total discrepancies in database: ${totalDiscrepancies}`);
}

testWithNewData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
