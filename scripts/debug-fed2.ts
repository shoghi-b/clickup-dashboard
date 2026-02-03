import 'dotenv/config';
import { prisma } from '@/lib/prisma';

async function main() {
    const date = new Date('2026-02-02');
    console.log(`Checking records for date: ${date.toISOString().split('T')[0]}`);

    const records = await prisma.attendanceRecord.findMany({
        where: {
            date: date
        }
    });

    console.log(`Found ${records.length} records for Feb 2nd.`);

    for (const r of records) {
        console.log(`\nName: ${r.employeeName}`);
        console.log(`Total Hours: ${r.totalHours}`);
        console.log(`Status: ${r.status}`);
        console.log(`In/Out Periods: ${r.inOutPeriods}`);
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
