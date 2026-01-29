// Verify the uploaded attendance data has inOutPeriods
import { prisma } from './lib/prisma';

async function verifyUpload() {
    console.log('🔍 Verifying uploaded attendance data...\n');

    // Get most recent records with inOutPeriods
    const recentWithPeriods = await prisma.attendanceRecord.findMany({
        where: {
            inOutPeriods: { not: null }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log(`✅ Found ${recentWithPeriods.length} records with IN/OUT periods\n`);

    if (recentWithPeriods.length > 0) {
        recentWithPeriods.forEach((record, idx) => {
            console.log(`${idx + 1}. ${record.employeeName} - ${record.date.toISOString().split('T')[0]}`);
            console.log(`   First IN: ${record.firstIn}`);
            console.log(`   Last OUT: ${record.lastOut}`);
            console.log(`   IN/OUT Periods: ${record.inOutPeriods}`);

            // Parse and display the periods nicely
            try {
                const periods = JSON.parse(record.inOutPeriods || '[]');
                console.log(`   Parsed periods (${periods.length}):`);
                periods.forEach((p: any, i: number) => {
                    console.log(`     ${i + 1}. IN ${p.in} → OUT ${p.out}`);
                });
            } catch (e) {
                console.log('   Could not parse periods');
            }
            console.log('');
        });
    } else {
        console.log('⚠️  No records with IN/OUT periods found');
    }

    // Get total count
    const total = await prisma.attendanceRecord.count();
    const withPeriods = await prisma.attendanceRecord.count({
        where: { inOutPeriods: { not: null } }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total attendance records: ${total}`);
    console.log(`   With IN/OUT periods: ${withPeriods}`);
    console.log(`   Without IN/OUT periods: ${total - withPeriods}`);
}

verifyUpload()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
