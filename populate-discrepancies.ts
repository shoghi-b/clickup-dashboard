// Populate discrepancies for the last 3 weeks
import { prisma } from './lib/prisma';
import { discrepancyService } from './lib/services/discrepancy-service';
import { startOfWeek, endOfWeek, subWeeks, format, eachDayOfInterval } from 'date-fns';

async function populateDiscrepancies() {
    console.log('🔍 Starting Discrepancy Detection for Last 3 Weeks...\n');

    // Define date ranges for last 3 weeks
    const now = new Date();
    const weeks = [
        {
            label: 'Current Week',
            start: startOfWeek(now, { weekStartsOn: 1 }),
            end: endOfWeek(now, { weekStartsOn: 1 })
        },
        {
            label: 'Last Week',
            start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
            end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
        },
        {
            label: 'Two Weeks Ago',
            start: startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 }),
            end: endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 })
        }
    ];

    // Fetch all team members
    const teamMembers = await prisma.teamMember.findMany({
        select: { id: true, username: true }
    });

    console.log(`📊 Found ${teamMembers.length} team members\n`);
    console.log('━'.repeat(70) + '\n');

    let totalDiscrepancies = 0;
    const discrepanciesByRule: Record<string, number> = {};
    const discrepanciesByMember: Record<string, number> = {};

    // Process each week
    for (const week of weeks) {
        console.log(`📅 ${week.label}: ${format(week.start, 'MMM dd')} - ${format(week.end, 'MMM dd, yyyy')}`);

        const days = eachDayOfInterval({ start: week.start, end: week.end });
        let weekDiscrepancies = 0;

        // Process each member
        for (const member of teamMembers) {
            let memberWeekDiscrepancies = 0;

            // Process each day
            for (const day of days) {
                try {
                    // Run discrepancy detection
                    const discrepancies = await discrepancyService.computeDiscrepancies(
                        member.id,
                        day
                    );

                    if (discrepancies.length > 0) {
                        // Save each discrepancy
                        for (const disc of discrepancies) {
                            // Check if already exists
                            const existing = await prisma.discrepancy.findFirst({
                                where: {
                                    teamMemberId: member.id,
                                    date: day,
                                    rule: disc.rule
                                }
                            });

                            if (!existing) {
                                await discrepancyService.saveDiscrepancy(disc);

                                // Track counts
                                if (disc.rule) {
                                    discrepanciesByRule[disc.rule] = (discrepanciesByRule[disc.rule] || 0) + 1;
                                }
                                discrepanciesByMember[member.username] = (discrepanciesByMember[member.username] || 0) + 1;

                                memberWeekDiscrepancies++;
                                weekDiscrepancies++;
                                totalDiscrepancies++;

                                // Log individual discrepancy
                                console.log(`   ⚠️  ${member.username} - ${format(day, 'MMM dd')}: ${disc.rule} (${disc.severity})`);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`   ❌ Error processing ${member.username} on ${format(day, 'MMM dd')}:`, error);
                }
            }
        }

        console.log(`   Total this week: ${weekDiscrepancies} discrepancies\n`);
    }

    console.log('━'.repeat(70));
    console.log('\n📊 SUMMARY REPORT\n');
    console.log('━'.repeat(70) + '\n');

    console.log(`Total Discrepancies Detected: ${totalDiscrepancies}\n`);

    if (Object.keys(discrepanciesByRule).length > 0) {
        console.log('By Rule:');
        Object.entries(discrepanciesByRule)
            .sort((a, b) => b[1] - a[1])
            .forEach(([rule, count]) => {
                const emoji = rule.includes('EXIT') ? '🔴' :
                    rule.includes('ATTENDANCE') ? '🟡' :
                        rule.includes('OUTSIDE') ? '🔵' : '🟢';
                console.log(`   ${emoji} ${rule}: ${count}`);
            });
        console.log('');
    }

    if (Object.keys(discrepanciesByMember).length > 0) {
        console.log('By Team Member:');
        Object.entries(discrepanciesByMember)
            .sort((a, b) => b[1] - a[1])
            .forEach(([member, count]) => {
                console.log(`   👤 ${member}: ${count}`);
            });
        console.log('');
    }

    // Get summary stats
    const stats = await prisma.discrepancy.groupBy({
        by: ['severity'],
        where: { status: 'open' },
        _count: true
    });

    if (stats.length > 0) {
        console.log('By Severity:');
        stats.forEach(stat => {
            const emoji = stat.severity === 'high' ? '🔴' :
                stat.severity === 'medium' ? '🟡' : '🔵';
            console.log(`   ${emoji} ${stat.severity.toUpperCase()}: ${stat._count}`);
        });
        console.log('');
    }

    console.log('━'.repeat(70));
    console.log('\n✅ Discrepancy population complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Open dashboard in browser');
    console.log('   2. Navigate to Week view');
    console.log('   3. Look for "Attendance Discrepancies" in Risk Signals card');
    console.log('   4. Click on any alert to open resolve drawer');
    console.log('   5. Select resolution reason and resolve\n');
}

populateDiscrepancies()
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
